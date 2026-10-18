"""Modelo de tendência da média do site (trend.py)."""

import datetime as dt
import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from placar_forecast import trend as TR  # noqa: E402


def site_avg(a_values, start="2026-09-20", step=3):
    d0 = dt.date.fromisoformat(start)
    pts = lambda vals: [{"date": (d0 + dt.timedelta(days=i * step)).isoformat(), "avg": v} for i, v in enumerate(vals)]
    return {"candidates": [{"candidate_id": "a", "trend": pts(a_values)},
                           {"candidate_id": "b", "trend": pts([100 - v for v in a_values])}]}


class Trend(unittest.TestCase):
    def test_rising_series_projects_up(self):
        sa = site_avg([46, 47, 48, 49, 50, 51, 52, 53])   # +1 p.p. a cada 3 dias
        last = (dt.date(2026, 9, 20) + dt.timedelta(days=21)).isoformat()
        pr = TR.project(sa, ["a", "b"], False, 0, "governador", last, 7, 21, 1.0)
        self.assertAlmostEqual(pr["shares_now"][0], 0.53, places=6)
        self.assertGreater(pr["shares_end"][0], 0.53)
        self.assertAlmostEqual(pr["pp_per_week"][0], 7 / 3, delta=0.15)
        self.assertAlmostEqual(float(pr["shares_end"].sum()), 1.0, places=12)

    def test_zero_damping_is_the_site_average(self):
        sa = site_avg([46, 47, 48, 49, 50, 51, 52, 53])
        last = (dt.date(2026, 9, 20) + dt.timedelta(days=21)).isoformat()
        pr = TR.project(sa, ["a", "b"], False, 0, "governador", last, 30, 21, 0.0)
        np.testing.assert_allclose(pr["shares_end"], pr["shares_now"])

    def test_counts_days_since_last_point(self):
        sa = site_avg([46, 47, 48, 49, 50, 51, 52, 53])
        last = (dt.date(2026, 9, 20) + dt.timedelta(days=21)).isoformat()
        later = (dt.date(2026, 9, 20) + dt.timedelta(days=28)).isoformat()
        # Janela larga o bastante para conter a série inteira nas duas datas.
        a = TR.project(sa, ["a", "b"], False, 0, "governador", last, 14, 60, 1.0)
        b = TR.project(sa, ["a", "b"], False, 0, "governador", later, 7, 60, 1.0)
        np.testing.assert_allclose(a["shares_end"], b["shares_end"])   # mesma eleição, mesma projeção

    def test_no_future_points_and_missing_candidate(self):
        sa = site_avg([46, 47, 48, 49, 50, 51, 52, 53])
        pr = TR.project(sa, ["a", "b"], False, 0, "governador", "2026-09-26", 7, 21, 1.0)
        self.assertEqual(pr["series_to"], "2026-09-26")              # nada depois da data de referência
        self.assertIsNone(TR.project(sa, ["a", "x"], False, 0, "governador", "2026-10-01", 7, 21, 1.0))


if __name__ == "__main__":
    unittest.main()
