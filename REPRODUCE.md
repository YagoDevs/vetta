# Reproduction guide — from a clean environment

Tested on macOS (Apple Silicon) with Python 3.12+; Linux equivalent. Node 20+ only if
you want to rebuild the frontend (a built copy is committed).

## 0. Setup (~2 min)

```bash
git clone <this repo> && cd vetta
make setup                 # python venv + pinned requirements.txt
```

## 1. Verify the inputs are deterministic (~1 min, offline)

```bash
make data                  # regenerates data/churn.csv — prints sha256, must match the committed file
make notebooks             # regenerates the 8 test notebooks + ground_truth/defects.json
```

Note: `make notebooks` re-executes the notebooks on your machine. Everything is seeded
except nb07 (Gabriela Lima, the *unseeded* notebook — its instability is a planted defect,
E3). Replay is keyed by stage tag, so regenerating notebooks does NOT break `make reproduce`.

## 2. Reproduce the official results (OFFLINE — no key, no cost, ~2 min)

```bash
make reproduce
```

This replays the recorded LLM responses (`runs/official_*/calls/`) through the full
pipeline and re-derives every number in the README table deterministically. It proves the
committed results follow from the committed inputs. Expected final output per run: the
baseline-vs-agent metric table; `official_b` shows agent F1 0.828 vs baseline 0.733.

## 3. Re-run live with your own key (optional, ~US$2, ~20 min)

```bash
cp .env.example .env       # put your OPENAI_API_KEY inside
make smoke                 # 1 notebook, ~30s, ~US$0.05 — validates key/setup
make rerun                 # 3 fresh runs of agent + baseline + evaluation
```

LLM outputs are non-deterministic: expect the numbers to move a little (we observed
F1 ±0.05 across runs). The qualitative signature — the baseline never catching the
seed-instability defect (E3) while vetta usually does — persisted in every run we performed.

Model: `gpt-5.2-2025-12-11` (dated snapshot, pinned in `adapters/llm.py`).

## 4. The dashboard (~10 s)

```bash
make serve                 # http://localhost:8000
```

Single process: FastAPI serves the API and the committed frontend build, reading the
official results. No database, no external services. Suggested tour: open
Carla Mendes → the flagged cell shows the claimed AUC 0.93 against the executed 0.729; the
"Baseline vs. Vetta" tab shows the comparison table; decision buttons record the human
call to `results/<run>/human_decisions.json`.

## Costs and time summary

| Path | Needs key | Cost | Time |
|---|---|---|---|
| `make reproduce` + `make serve` | no | 0 | ~3 min |
| `make smoke` | yes | ~US$0.05 | 30 s |
| `make rerun` | yes | ~US$2 | ~20 min |
