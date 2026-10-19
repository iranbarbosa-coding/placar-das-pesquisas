"""Modelo C: recuperação de parâmetros e seleção fora da amostra (testes estatísticos)."""

import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from placar_forecast import calibration as CAL  # noqa: E402
from placar_forecast.transforms import alr_sampling_cov  # noqa: E402

CATS = ["governador_t1", "senador_t1", "presidente_t1", "governador_t2"]


def synth_records(rng, n_groups=27, horizons=(1, 7, 30), s_true=0.08, nu=None, post_sd=0.03, shape="iso"):
    """Erros gerados com escala e forma conhecidas. Frações previstas variadas (líder, 2º, nanico)."""
    recs = []
    for g in range(n_groups):
        for cat in ("governador_t1", "senador_t1"):
            for h in horizons:
                p = rng.dirichlet([8, 5, 1])
                ref = int(np.argmax(p))
                M = alr_sampling_cov(p, ref, 1.0)
                L = np.linalg.cholesky(M) if shape == "mult" else np.eye(2)
                A = np.eye(2) * post_sd ** 2
                z = rng.normal(size=2)
                if nu:
                    z = z / np.sqrt(rng.gamma(nu / 2, 2 / nu))
                e = rng.normal(0, post_sd, 2) + s_true * (L @ z)
                recs.append({"e": e.tolist(), "A": A.tolist(), "M": M.tolist(), "cat": cat, "H": h,
                             "x": [0.0, 0.0], "group": f"G{g}"})
    return recs


def synth(rng, **kw):
    return CAL.build_error_set(synth_records(rng, **kw), CATS)


class Calibration(unittest.TestCase):
    def test_recovers_scale(self):
        es = synth(np.random.default_rng(1))
        f = CAL.fit_calibration(es, "agrupado", 1000.0, 0.75)
        self.assertAlmostEqual(f.scale("governador_t1", 7), 0.08, delta=0.015)
        self.assertAlmostEqual(f.scale("senador_t1", 7), 0.08, delta=0.015)
        # Categoria sem dado fica no α_0 agrupado (erro emprestado), entre as observadas.
        self.assertAlmostEqual(f.scale("governador_t2", 7), 0.08, delta=0.03)

    def test_systematic_error_is_selected_when_present(self):
        recs = synth_records(np.random.default_rng(2))
        sel = CAL.select(recs, CATS, [1000.0], 0.75, ("sem_sistematico", "agrupado"), ("iso",))
        self.assertEqual(sel["best"]["variant"], "agrupado")

    def test_no_systematic_when_absent(self):
        es = synth(np.random.default_rng(3), s_true=0.0)
        f = CAL.fit_calibration(es, "agrupado", 1000.0, 0.75)
        self.assertLess(f.scale("governador_t1", 7), 0.02)

    def test_structure_is_identified(self):
        # Forma multinomial verdadeira → "mult"; isotrópica verdadeira → "iso".
        m = CAL.select(synth_records(np.random.default_rng(10), shape="mult", s_true=0.05), CATS, [1000.0], 0.75, ("agrupado",))
        self.assertEqual(m["best"]["structure"], "mult")
        i = CAL.select(synth_records(np.random.default_rng(11), shape="iso"), CATS, [1000.0], 0.75, ("agrupado",))
        self.assertEqual(i["best"]["structure"], "iso")

    def test_point_forecast_never_selects_zero_error(self):
        # Previsão pontual (A = 0): sem erro sistemático a densidade é −∞; a regra de
        # um erro-padrão não pode tratar isso como empate (defeito de 18/10/2026).
        recs = synth_records(np.random.default_rng(12), post_sd=0.0)
        for r in recs:
            r["A"] = [[0.0, 0.0], [0.0, 0.0]]
        sel = CAL.select(recs, CATS, [1000.0], 0.75, ("sem_sistematico", "agrupado"), ("iso",))
        self.assertEqual(sel["best"]["variant"], "agrupado")

    def test_quadrature_accuracy(self):
        # 64 nós estratificados × 4.096: erro de log-densidade desprezível diante das
        # diferenças entre variantes (ordem de 0,1 por registro).
        es = synth(np.random.default_rng(5))
        s = np.full(es.R, 0.08)
        a = CAL.record_logdens(es, s, 3.0)
        saved = CAL._NODES.pop(3.0, None)
        CAL._NODES[3.0] = np.quantile(np.random.default_rng(7).gamma(1.5, 2 / 3, size=400000), (np.arange(4096) + 0.5) / 4096)
        b = CAL.record_logdens(es, s, 3.0)
        CAL._NODES.pop(3.0)
        if saved is not None:
            CAL._NODES[3.0] = saved
        self.assertLess(np.abs(a - b).max(), 0.01)

    def test_fat_tails_selected_for_t_errors(self):
        recs = synth_records(np.random.default_rng(4), n_groups=40, nu=3)
        sel = CAL.select(recs, CATS, [3.0, 1000.0], 0.75, ("agrupado",), ("iso",))
        self.assertEqual(sel["best"]["nu"], 3.0)


if __name__ == "__main__":
    unittest.main()
