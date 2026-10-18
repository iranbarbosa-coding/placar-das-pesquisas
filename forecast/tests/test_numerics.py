"""Transformações, diagnósticos, simulação e métricas — testes unitários e estatísticos."""

import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from placar_forecast.diagnostics import ess_bulk, ndtri, rhat  # noqa: E402
from placar_forecast.scoring import crps_samples, score_record  # noqa: E402
from placar_forecast.simulate import event_probabilities, simulate, variance_decomposition  # noqa: E402
from placar_forecast.transforms import alr, alr_sampling_cov, continuity, inv_alr  # noqa: E402


class Transforms(unittest.TestCase):
    def test_roundtrip_and_simplex(self):
        rng = np.random.default_rng(1)
        p = rng.dirichlet([3, 2, 1, 0.5], size=500)
        for ref in range(4):
            back = inv_alr(alr(p, ref), ref)
            np.testing.assert_allclose(back, p, rtol=1e-10, atol=1e-12)
        np.testing.assert_allclose(inv_alr(rng.normal(0, 30, (100, 3)), 0).sum(axis=1), 1.0, atol=1e-12)

    def test_numerical_instability_extremes(self):
        # Valores ALR enormes não podem virar NaN (softmax estável).
        y = np.array([[800.0, -800.0], [-1e4, 1e4]])
        out = inv_alr(y, 2)
        self.assertTrue(np.all(np.isfinite(out)))
        np.testing.assert_allclose(out.sum(axis=1), 1.0)

    def test_zero_share_needs_continuity(self):
        with self.assertRaises(ValueError):
            alr(np.array([0.5, 0.5, 0.0]), 0)
        q = continuity(np.array([0.5, 0.5, 0.0]), 1000)
        self.assertTrue(np.all(q > 0)); self.assertAlmostEqual(q.sum(), 1.0)

    def test_delta_method_matches_multinomial(self):
        # Estatístico: a covariância delta da ALR bate com a de amostras multinomiais.
        rng = np.random.default_rng(2)
        p = np.array([0.45, 0.35, 0.2]); n = 2000
        draws = rng.multinomial(n, p, size=40000) / n
        emp = np.cov(alr(draws, 0).T)
        theo = alr_sampling_cov(p, 0, n)
        np.testing.assert_allclose(emp, theo, rtol=0.05)


class Diagnostics(unittest.TestCase):
    def test_ndtri(self):
        np.testing.assert_allclose(ndtri(np.array([0.5, 0.975, 0.025, 1e-6])), [0, 1.959964, -1.959964, -4.753424], atol=1e-5)

    def test_rhat_iid_and_nonconvergent(self):
        rng = np.random.default_rng(3)
        ok = rng.normal(size=(4, 1000))
        self.assertLess(rhat(ok), 1.01)
        bad = ok + np.array([0, 0, 0, 3.0])[:, None]       # uma cadeia presa noutro modo
        self.assertGreater(rhat(bad), 1.1)
        inf = ok.copy(); inf[0, 5] = np.nan
        self.assertEqual(rhat(inf), float("inf"))

    def test_ess(self):
        rng = np.random.default_rng(4)
        self.assertGreater(ess_bulk(rng.normal(size=(4, 1000))), 3000)
        x = np.zeros((4, 1000))
        for c in range(4):
            e = rng.normal(size=1000)
            for t in range(1, 1000):
                x[c, t] = 0.95 * x[c, t - 1] + e[t]
        self.assertLess(ess_bulk(x), 400)   # AR(0,95): ESS teórico ≈ N·(1−ρ)/(1+ρ) ≈ 103


class Simulation(unittest.TestCase):
    def setUp(self):
        rng = np.random.default_rng(5)
        self.mu = rng.normal([0.1, -0.5], 0.05, size=(4000, 2))
        self.srw = np.abs(rng.normal(0.01, 0.002, 4000))

    def test_valid_and_deterministic(self):
        a = simulate(self.mu, self.srw, 0, 7, 0.05, 5, 100000, 42)
        b = simulate(self.mu, self.srw, 0, 7, 0.05, 5, 100000, 42)
        c = simulate(self.mu, self.srw, 0, 7, 0.05, 5, 100000, 43)
        np.testing.assert_array_equal(a, b)
        self.assertFalse(np.array_equal(a, c))
        np.testing.assert_allclose(a.sum(axis=1), 1.0, atol=1e-12)
        self.assertTrue(np.all((a > 0) & (a < 1)))

    def test_fat_tails(self):
        n = simulate(self.mu, self.srw, 0, 0, 0.1, None, 200000, 1)
        t = simulate(self.mu, self.srw, 0, 0, 0.1, 3, 200000, 1)
        tail = lambda s: np.mean(np.abs(s[:, 0] - np.median(s[:, 0])) > 0.12)
        self.assertGreater(tail(t), 2 * tail(n))

    def test_uncertainty_grows_with_horizon_and_components(self):
        s0 = simulate(self.mu, self.srw, 0, 0, 0.0, None, 50000, 1)[:, 0].std()
        s30 = simulate(self.mu, self.srw, 0, 30, 0.0, None, 50000, 1)[:, 0].std()
        s30s = simulate(self.mu, self.srw, 0, 30, 0.05, None, 50000, 1)[:, 0].std()
        self.assertLess(s0, s30); self.assertLess(s30, s30s)
        vd = variance_decomposition(self.mu, self.srw, 30, 0.05, 10)
        self.assertAlmostEqual(sum(vd.values()), 1.0, places=12)

    def test_event_probabilities_are_distributions(self):
        sh = simulate(self.mu, self.srw, 0, 7, 0.05, 5, 50000, 2)
        ev = event_probabilities(sh, 2, "governador", 1)
        self.assertAlmostEqual(sum(ev["first"]), 1.0, places=12)
        self.assertTrue(0 <= ev["decided_first_round"] <= 1)


class Scoring(unittest.TestCase):
    def test_crps(self):
        self.assertAlmostEqual(crps_samples(np.full(1000, 3.0), 5.0), 2.0)
        rng = np.random.default_rng(6)
        # CRPS de N(0,1) em y = 0 é (√2 − 1)/√π ≈ 0,2337
        self.assertAlmostEqual(crps_samples(rng.normal(size=200000), 0.0), 0.2337, places=2)

    def test_perfect_vs_wrong_forecast(self):
        sure = np.tile([0.6, 0.4], (1000, 1))
        good = score_record(sure, np.array([0.6, 0.4]), 2, "governador", 2)
        self.assertEqual(good["events"]["brier_first"], 0.0)
        bad = score_record(sure, np.array([0.4, 0.6]), 2, "governador", 2)
        self.assertEqual(bad["events"]["brier_first"], 2.0)
        self.assertTrue(bad["events"]["zero_prob_first"])     # evento com probabilidade 0 é CONTADO


if __name__ == "__main__":
    unittest.main()
