"""Seleção de pesquisas, Modelo A, vazamento temporal e segurança da publicação."""

import json
import os
import sys
import tempfile
import threading
import unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from helpers import cfg, export_doc, poll, synthetic_runoff  # noqa: E402
from placar_forecast import data as D  # noqa: E402
from placar_forecast import publish as P  # noqa: E402
from placar_forecast import ssm  # noqa: E402
from placar_forecast.backtest import _fit_task  # noqa: E402
from placar_forecast.transforms import inv_alr  # noqa: E402
from placar_forecast.vintage import vintage_for  # noqa: E402

PAIR = ["c_a", "c_b"]


def reasons(excl):
    return {e["id"]: e["reason"] for e in excl}


class Selection(unittest.TestCase):
    def setUp(self):
        self.c = cfg()

    def test_missing_polls_is_insufficient_not_invented(self):
        ex = export_doc([poll("p1", "2026-10-10", 50, 50)])
        with self.assertRaises(D.InsufficientData):
            D.build_race(ex, "governador:XX", 2, "2026-10-18", self.c, pairing=PAIR)
        with self.assertRaises(D.InsufficientData):
            D.build_race(export_doc([]), "governador:XX", 2, "2026-10-18", self.c, pairing=PAIR)

    def test_malformed_percentages(self):
        bad = [poll("neg", "2026-10-10", -5, 105), poll("big", "2026-10-11", 120, 30),
               poll("nan", "2026-10-12", float("nan"), 50), poll("sum", "2026-10-13", 60, 45)]
        good = [poll(f"g{i}", f"2026-10-0{i+1}", 50, 50, pollster=f"I{i}") for i in range(5)]
        inc, excl = D.select_polls(export_doc(bad + good), "governador:XX", 2, "2026-10-18", self.c, PAIR)
        r = reasons(excl)
        for pid in ("neg", "big", "nan", "sum"):
            self.assertEqual(r[pid], "percentual_invalido")
        self.assertEqual(len(inc), 5)

    def test_duplicates_same_sample_and_republication(self):
        a = poll("q1", "2026-10-10", 52, 48, pollster="X")
        b = dict(poll("q2", "2026-10-10", 51, 49, pollster="X")); b["survey_key"] = a["survey_key"]
        rep = poll("q3", "2026-10-14", 52, 48, pollster="X")           # mesmos números, mesma amostra, 4 dias depois
        later = poll("q4", "2026-10-30", 52, 48, pollster="X")         # fora dos 7 dias (e da data): não é republicação
        inc, excl = D.select_polls(export_doc([a, b, rep]), "governador:XX", 2, "2026-10-18", self.c, PAIR)
        r = reasons(excl)
        self.assertEqual(r["q2"], "mesma_amostra")
        self.assertEqual(r["q3"], "provavel_republicacao")
        self.assertEqual([p["id"] for p in inc], ["q1"])
        self.assertIsNotNone(later)

    def test_candidate_id_mismatch_and_unresolved(self):
        other = poll("o", "2026-10-10", 50, 50, ids=("c_a", "c_z"))
        unres = poll("u", "2026-10-10", 50, 50, ids=("c_a", None))
        three = poll("t", "2026-10-10", 40, 40, extra=[{"candidate_id": "c_z", "person_id": None, "name": "Z", "party": None, "pct": 20, "pct_result_basis": 20}])
        _, excl = D.select_polls(export_doc([other, unres, three]), "governador:XX", 2, "2026-10-18", self.c, PAIR)
        r = reasons(excl)
        self.assertEqual(r["o"], "par_diferente")
        self.assertEqual(r["u"], "candidato_nao_resolvido")
        self.assertEqual(r["t"], "par_diferente")

    def test_wrong_round_and_wrong_contest_are_not_used(self):
        ps = [poll(f"r1{i}", "2026-10-01", 50, 50, round_=1) for i in range(5)]
        ps += [poll(f"uf{i}", "2026-10-01", 50, 50, contest="governador:YY") for i in range(5)]
        inc, _ = D.select_polls(export_doc(ps), "governador:XX", 2, "2026-10-18", self.c, PAIR)
        self.assertEqual(inc, [])

    def test_time_leakage_is_blocked(self):
        ps = [poll(f"p{i}", f"2026-10-0{i+1}", 50, 50, pollster=f"I{i}") for i in range(5)]
        future_field = poll("fut", "2026-10-20", 70, 30)
        late_pub = poll("late", "2026-10-15", 70, 30, available="2026-10-19")
        inc, excl = D.select_polls(export_doc(ps + [future_field, late_pub]), "governador:XX", 2, "2026-10-18", self.c, PAIR)
        r = reasons(excl)
        self.assertIn(r["fut"], ("indisponivel_na_data", "campo_posterior_a_data"))
        self.assertEqual(r["late"], "indisponivel_na_data")
        self.assertTrue(all(p["available_from"] <= "2026-10-18" for p in inc))

    def test_missing_sample_size_is_imputed_and_flagged(self):
        ps = [poll(f"p{i}", f"2026-10-0{i+1}", 50, 50, pollster=f"I{i}", n=1000 + 100 * i) for i in range(5)]
        ps.append(poll("nosize", "2026-10-09", 50, 50, sample=False))
        race = D.build_race(export_doc(ps), "governador:XX", 2, "2026-10-18", self.c, pairing=PAIR)
        k = race.poll_ids.index("nosize")
        self.assertTrue(race.n_imputed[k])
        self.assertGreaterEqual(race.n_eff[k], self.c["data"]["imputed_n_floor"] * 0.9 * 0.99)
        self.assertTrue(next(p for p in race.included if p["id"] == "nosize")["n_imputado"])

    def test_dataset_hash_is_canonical(self):
        ps = [poll(f"p{i}", f"2026-10-0{i+1}", 50 + i, 50 - i, pollster=f"I{i}") for i in range(5)]
        h1 = D.build_race(export_doc(ps), "governador:XX", 2, "2026-10-18", self.c, pairing=PAIR).dataset_hash()
        h2 = D.build_race(export_doc(list(reversed(ps))), "governador:XX", 2, "2026-10-18", self.c, pairing=PAIR).dataset_hash()
        h3 = D.build_race(export_doc(ps), "governador:XX", 2, "2026-10-17", self.c, pairing=PAIR).dataset_hash()
        self.assertEqual(h1, h2); self.assertNotEqual(h1, h3)


class ModelA(unittest.TestCase):
    def test_zero_variance_inputs_fit_finitely(self):
        # Seis institutos DIFERENTES com o mesmo número: variância zero entre pesquisas.
        # (Com um instituto só, a guarda de republicação os funde — e deve.)
        ps = [poll(f"p{i}", f"2026-10-0{i+1}", 50, 50, pollster=f"I{i}") for i in range(6)]
        race = D.build_race(export_doc(ps), "governador:XX", 2, "2026-10-18", cfg(), pairing=PAIR)
        self.assertEqual(len(race.poll_ids), 6)
        f = ssm.fit(race, cfg(), 1)
        sh = inv_alr(f.mu_ref, race.ref)
        self.assertTrue(np.all(np.isfinite(sh)))
        self.assertAlmostEqual(float(np.median(sh[..., 0])), 0.5, delta=0.02)

    def test_reproducible_with_seed(self):
        ps = [poll(f"p{i}", f"2026-10-0{i+1}", 48 + i, 52 - i, pollster=f"I{i%3}") for i in range(6)]
        race = D.build_race(export_doc(ps), "governador:XX", 2, "2026-10-18", cfg(), pairing=PAIR)
        a = ssm.fit(race, cfg(), 7); b = ssm.fit(race, cfg(), 7); c = ssm.fit(race, cfg(), 8)
        np.testing.assert_array_equal(a.mu, b.mu)
        self.assertFalse(np.array_equal(a.mu, c.mu))

    def test_recovers_truth_and_house_effects(self):
        # Estatístico: dados gerados do próprio modelo. Com 24 réplicas, a cobertura do
        # intervalo de 80% abaixo de 60% teria probabilidade < 1% se o modelo estivesse
        # calibrado (binomial(24; 0,8)); o efeito casa tem de sair com o sinal certo.
        # Medido em 40 réplicas (17/10/2026): cobertura 82,5%, dp do erro padronizado 0,85.
        c = cfg()
        house = {"Alto": 0.12, "Baixo": -0.12, "Neutro": 0.0}
        covered, signs, zs = 0, 0, []
        reps = 24
        for r in range(reps):
            rng = np.random.default_rng(1000 + r)
            path = np.cumsum(rng.normal(0, 0.01, 60)) + 0.2
            ps = synthetic_runoff(rng, true_logit_path=path, house=house, days=60, polls_per_day=0.5)
            race = D.build_race(export_doc(ps), "governador:XX", 2, "2026-10-30", c, pairing=PAIR)
            f = ssm.fit(race, c, r)
            truth = path[-1] if race.ref == 1 else -path[-1]     # mesma escala ALR (ref = líder)
            d = f.mu[:, :, -1, 0].ravel()
            covered += np.quantile(d, 0.1) <= truth <= np.quantile(d, 0.9)
            zs.append((truth - d.mean()) / d.std())
            sgn = 1 if race.ref == 1 else -1
            j_hi, j_lo = race.pollsters.index("Alto"), race.pollsters.index("Baixo")
            signs += (sgn * np.median(f.h[:, :, j_hi, 0]) > sgn * np.median(f.h[:, :, j_lo, 0]))
        self.assertGreaterEqual(covered / reps, 0.6)
        self.assertTrue(0.6 < np.std(zs) < 1.4, np.std(zs))
        self.assertEqual(signs, reps)

    def test_common_bias_is_not_identifiable_from_polls(self):
        # Estatístico: um viés comum a TODAS as pesquisas passa direto para o nowcast.
        # É por isso que o erro sistemático vem da calibração contra as urnas (Modelo C).
        c = cfg()
        rng = np.random.default_rng(9)
        path = np.full(40, 0.0)
        ps = synthetic_runoff(rng, true_logit_path=path, house={"A": 0.0, "B": 0.0}, days=40, polls_per_day=1.0, bias=0.15)
        race = D.build_race(export_doc(ps), "governador:XX", 2, "2026-10-10", c, pairing=PAIR)
        f = ssm.fit(race, c, 1)
        sh = inv_alr(f.mu_ref, race.ref)[..., race.candidate_ids.index("c_a")]
        lo, hi = np.quantile(sh, [0.05, 0.95])
        self.assertGreater(lo, 0.5)        # a verdade (50%) fica FORA do intervalo do nowcast

    def test_convergence_gate(self):
        good = {"rhat_max": 1.004, "ess_min": 900}
        self.assertTrue(ssm.converged(good, cfg())[0])
        for bad in ({"rhat_max": 1.2, "ess_min": 900}, {"rhat_max": 1.0, "ess_min": 50}, {"rhat_max": float("inf"), "ess_min": 900}):
            ok, why = ssm.converged(bad, cfg())
            self.assertFalse(ok); self.assertTrue(why)


class Leakage(unittest.TestCase):
    def test_training_export_with_results_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            ps = [poll(f"p{i}", f"2026-09-0{i+1}", 50, 50, round_=1, pollster=f"I{i}") for i in range(6)]
            doc = export_doc(ps, official=[{"contest": "governador:XX", "round": 1, "candidates": []}])
            path = os.path.join(tmp, "train.json")
            json.dump(doc, open(path, "w"))
            rec = _fit_task((path, "governador:XX", 1, "2026-09-20", 14, "full", cfg(), tmp, {"kind": "test"}))
            self.assertEqual(rec["status"], "error")
            self.assertIn("vazamento", rec["reason"])

    def test_vintage_cutoff_is_end_of_day_brasilia(self):
        import datetime as dtm
        utc = dtm.timezone.utc
        v = [("a", dtm.datetime(2026, 9, 20, 23, 0, tzinfo=utc)),     # 20h em Brasília: vale para 20/09
             ("b", dtm.datetime(2026, 9, 21, 2, 59, tzinfo=utc)),     # 23h59 em Brasília: ainda 20/09
             ("c", dtm.datetime(2026, 9, 21, 3, 0, tzinfo=utc))]      # 00h00 de 21/09: NÃO vale
        self.assertEqual(vintage_for("2026-09-20", 3, v).commit, "b")
        self.assertEqual(vintage_for("2026-09-19", 3, v).kind, "reconstructed")


class Publication(unittest.TestCase):
    def test_artifacts_never_contain_nonfinite_json(self):
        # 18/10/2026: um −∞ na tabela de seleção virou "Infinity" e o site recusou o backtest inteiro.
        from placar_forecast.evaluate import _write
        with tempfile.TemporaryDirectory() as tmp:
            p = os.path.join(tmp, "b.json")
            _write(p, {"a": float("-inf"), "b": [float("nan"), 1.5], "c": np.float64(np.inf)})
            txt = open(p).read()
            self.assertNotIn("Infinity", txt); self.assertNotIn("NaN", txt)
            self.assertEqual(json.loads(txt), {"a": None, "b": [None, 1.5], "c": None})

    def test_immutable_snapshots(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = os.path.join(tmp, "s.json")
            self.assertEqual(P.write_immutable(p, b"abc"), "novo")
            self.assertEqual(P.write_immutable(p, b"abc"), "identico")
            with self.assertRaises(FileExistsError):
                P.write_immutable(p, b"abd")

    def test_lock_prevents_duplicate_execution(self):
        with tempfile.TemporaryDirectory() as tmp:
            lock = os.path.join(tmp, ".lock")
            entered = threading.Event(); release = threading.Event(); errs = []

            def holder():
                with P.exclusive_lock(lock):
                    entered.set(); release.wait(5)
            t = threading.Thread(target=holder); t.start(); entered.wait(5)
            try:
                with P.exclusive_lock(lock):
                    errs.append("entrou")
            except P.LockBusy:
                pass
            release.set(); t.join()
            self.assertEqual(errs, [])

    def _snap(self):
        s = {"schema": P.SNAPSHOT_SCHEMA, "race_id": "x", "reference_date": "2026-10-18", "election_date": "2026-10-25",
             "model": {}, "input": {}, "status": {"probability": "retida"},
             "nowcast": {"summary": [{"label": "A", "mean": 52.0, "quantiles": {"0.1": 50.0, "0.5": 52.0, "0.9": 54.0}},
                                     {"label": "B", "mean": 48.0, "quantiles": {"0.1": 46.0, "0.5": 48.0, "0.9": 50.0}}]},
             "projection": None, "probabilities": None}
        s["output_sha256"] = P.output_hash(s)
        return s

    def test_validator_catches_tampering_and_invalid_distributions(self):
        s = self._snap()
        self.assertEqual(P.validate_snapshot(s), [])
        t = json.loads(json.dumps(s)); t["nowcast"]["summary"][0]["mean"] = 60.0
        self.assertTrue(any("hash" in e for e in P.validate_snapshot(t)))
        u = json.loads(json.dumps(s)); u["nowcast"]["summary"][0]["mean"] = 60.0; u["output_sha256"] = P.output_hash(u)
        self.assertTrue(any("somam" in e for e in P.validate_snapshot(u)))
        v = json.loads(json.dumps(s)); v["probabilities"] = {"first": [0.7, 0.7]}; v["output_sha256"] = P.output_hash(v)
        errs = P.validate_snapshot(v)
        self.assertTrue(any("inválidas" in e for e in errs)); self.assertTrue(any("retida" in e for e in errs))
        w = json.loads(json.dumps(s)); w["nowcast"]["summary"][0]["quantiles"]["0.9"] = 40.0; w["output_sha256"] = P.output_hash(w)
        self.assertTrue(any("monótonos" in e for e in P.validate_snapshot(w)))
        # Probabilidade experimental (decisão editorial) exige as probabilidades no snapshot.
        x = json.loads(json.dumps(s)); x["status"]["probability"] = "experimental"; x["output_sha256"] = P.output_hash(x)
        self.assertTrue(any("experimental" in e for e in P.validate_snapshot(x)))
        y = json.loads(json.dumps(x)); y["probabilities"] = {"first": [0.62, 0.38]}; y["output_sha256"] = P.output_hash(y)
        self.assertEqual(P.validate_snapshot(y), [])

    def test_probability_gate_withholds_without_history(self):
        c = cfg()
        calib = {"categories": {"presidente_t2": {"n_contests": 0, "n_elections": 0, "borrowed": True},
                                "governador_t1": {"n_contests": 27, "n_elections": 1, "borrowed": False}}}
        ok, why = P.probability_gate(c, calib, "presidente_t2", None)
        self.assertFalse(ok); self.assertTrue(why)
        ok, why = P.probability_gate(c, calib, "governador_t1", None)
        self.assertFalse(ok)                      # uma eleição só não basta
        calib["categories"]["governador_t1"]["n_elections"] = 3
        ok, _ = P.probability_gate(c, calib, "governador_t1", {"overall": {"coverage": {"80": 0.79}}})
        self.assertTrue(ok)
        ok, _ = P.probability_gate(c, calib, "governador_t1", {"overall": {"coverage": {"80": 0.5}}})
        self.assertFalse(ok)                      # cobertura ruim no backtest também retém
        self.assertFalse(P.probability_gate(c, None, "governador_t1", None)[0])


if __name__ == "__main__":
    unittest.main()
