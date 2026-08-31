"""Vercel Python serverless function: POST /api/forecast

Request body:  {"history": [{"date": "YYYY-MM-DD", "cost": number}, ...], "days": 14}
Response body: {"forecast": [{"date": "YYYY-MM-DD", "cost": number, "lower": number, "upper": number}, ...]}

`compute_forecast` is a plain function with no HTTP dependency, so it can be
unit-tested directly (`python3 -c "from forecast import compute_forecast; ..."`)
without going through Vercel's runtime at all. Vercel could not be exercised
locally for this project (no CLI login in this environment), so the HTTP
handler wrapper below follows Vercel's documented BaseHTTPRequestHandler
convention but is untested against the actual deployed runtime.
"""

import json
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler

import numpy as np
import pandas as pd
from statsmodels.tsa.exponential_smoothing.ets import ETSModel

SEASONAL_PERIOD = 7  # weekly seasonality in daily spend data
MIN_FOR_SEASONAL = SEASONAL_PERIOD * 2  # ETS needs >=2 full cycles to fit one
MIN_FOR_TREND = 4


def compute_forecast(history: list[dict], days: int = 14) -> list[dict]:
    if not history:
        raise ValueError("history must not be empty")

    df = pd.DataFrame(history)
    df["date"] = pd.to_datetime(df["date"])
    series = df.groupby("date")["cost"].sum().sort_index()

    # Reindex to a continuous daily range — a day with no usage is a real
    # zero, not a missing observation, and ETS needs an evenly spaced index.
    full_index = pd.date_range(series.index.min(), series.index.max(), freq="D")
    series = series.reindex(full_index, fill_value=0.0)

    n = len(series)
    last_date = series.index[-1]
    future_index = pd.date_range(last_date + timedelta(days=1), periods=days, freq="D")

    if n < MIN_FOR_TREND:
        # Not enough history for any real model — flat-line the recent
        # average with a wide band rather than fail or fabricate a trend.
        avg = float(series.mean())
        spread = max(avg * 0.5, 0.01)
        return [
            {
                "date": d.strftime("%Y-%m-%d"),
                "cost": round(avg, 4),
                "lower": round(max(0.0, avg - spread), 4),
                "upper": round(avg + spread, 4),
            }
            for d in future_index
        ]

    use_seasonal = n >= MIN_FOR_SEASONAL
    model = ETSModel(
        series,
        error="add",
        trend="add",
        damped_trend=True,
        seasonal="add" if use_seasonal else None,
        seasonal_periods=SEASONAL_PERIOD if use_seasonal else None,
    )
    fit = model.fit(disp=False)

    prediction = fit.get_prediction(start=n, end=n + days - 1)
    summary = prediction.summary_frame(alpha=0.2)  # 80% interval

    results = []
    for date, row in zip(future_index, summary.itertuples()):
        cost = max(0.0, float(row.mean))
        lower = max(0.0, float(row.pi_lower))
        upper = max(0.0, float(row.pi_upper))
        results.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "cost": round(cost, 4),
                "lower": round(lower, 4),
                "upper": round(upper, 4),
            }
        )
    return results


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) or b"{}"

        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            self._respond(400, {"error": "request body must be valid JSON"})
            return

        history = body.get("history")
        days = int(body.get("days", 14))

        if not isinstance(history, list) or not history:
            self._respond(400, {"error": "history must be a non-empty array"})
            return

        try:
            forecast = compute_forecast(history, days)
            self._respond(200, {"forecast": forecast})
        except Exception as exc:  # noqa: BLE001 — surface the real error to the caller
            self._respond(500, {"error": str(exc)})

    def _respond(self, status: int, payload: dict):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)
