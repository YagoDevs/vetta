"""Vetta — CLI do pipeline.

Uso:
  python vetta.py run notebooks/ --mode live --run-id official_a
  python vetta.py run notebooks/ --mode replay --run-id official_a   # offline
"""
import argparse
import json
import sys
import time
from pathlib import Path

from adapters.executor import execute_notebook
from adapters.llm import make_client
from core.assessor import assess
from core.reporter import report
from core.verifier import verify

ROOT = Path(__file__).resolve().parent


def run(nb_dir: Path, mode: str, run_id: str):
    run_dir = ROOT / "runs" / run_id
    out_dir = ROOT / "results" / run_id
    out_dir.mkdir(parents=True, exist_ok=True)
    llm = make_client(mode, run_dir / "calls")
    notebooks = sorted(nb_dir.glob("*.ipynb"))
    print(f"vetta run: {len(notebooks)} notebooks | mode={mode} | run_id={run_id}")
    for path in notebooks:
        t0 = time.time()
        facts = execute_notebook(path)
        trajectory = [{"agent": "executor", "executed_ok": facts.executed_ok,
                       "error_cells": facts.error_cells,
                       "metrics": facts.metrics_by_seed}]
        findings, v_step = verify(llm, facts)
        trajectory.append(v_step)
        scores, justs, a_step = assess(llm, facts, findings)
        trajectory.append(a_step)
        verdict = report(llm, facts, findings, scores, justs, trajectory)
        out = out_dir / f"{path.stem}.json"
        out.write_text(json.dumps(verdict.to_dict(), indent=2, ensure_ascii=False))
        print(f"  {path.stem}: {verdict.decision} (score {verdict.weighted_score}) "
              f"{len(findings)} findings [{time.time()-t0:.0f}s]")
    print(f"resultados em {out_dir}/")


def main():
    ap = argparse.ArgumentParser(prog="vetta")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("run")
    p.add_argument("notebooks", type=Path)
    p.add_argument("--mode", choices=["live", "replay"], default="replay")
    p.add_argument("--run-id", default="dev")
    args = ap.parse_args()
    if args.cmd == "run":
        run(args.notebooks, args.mode, args.run_id)


if __name__ == "__main__":
    sys.exit(main())
