"""Avaliacao contra o gabarito: precision/recall de defeitos + acuracia de decisao.

Compara agente (results/<run>/nbXX.json) e baseline (results/<run>/baseline/)
com ground_truth/defects.json. Match de defeito: mesmo tipo, celula +-1.
Deterministico — nenhum LLM aqui.

Uso: python evaluate.py --run-id official_a
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GT = json.loads((ROOT / "ground_truth" / "defects.json").read_text())


def match(found: dict, planted: dict) -> bool:
    return found["type"] == planted["type"] and abs(int(found["cell"]) - int(planted["cell"])) <= 1


def score_run(result_dir: Path) -> dict:
    tp = fp = fn = 0
    decisions_ok = 0
    per_class = {"S": {"tp": 0, "fn": 0, "fp": 0}, "E": {"tp": 0, "fn": 0, "fp": 0}}
    rows = []
    n_notebooks = 0
    for name, meta in GT["notebooks"].items():
        f = result_dir / f"{name}.json"
        if not f.exists():
            continue
        n_notebooks += 1
        res = json.loads(f.read_text())
        planted = list(meta["defects"])
        found = list(res["findings"])
        used = set()
        nb_tp = []
        for p in planted:
            hit = next((i for i, x in enumerate(found)
                        if i not in used and match(x, p)), None)
            if hit is not None:
                used.add(hit)
                tp += 1
                per_class[p["type"][0]]["tp"] += 1
                nb_tp.append(p["type"])
            else:
                fn += 1
                per_class[p["type"][0]]["fn"] += 1
        nb_fp = [x["type"] for i, x in enumerate(found) if i not in used]
        fp += len(nb_fp)
        for t in nb_fp:
            if t[0] in per_class:
                per_class[t[0]]["fp"] += 1
        dec_ok = res["decision"] == meta["expected_decision"]
        decisions_ok += dec_ok
        rows.append({"notebook": name, "expected": meta["expected_decision"],
                     "got": res["decision"], "decision_ok": dec_ok,
                     "defects_found": nb_tp, "false_positives": nb_fp,
                     "missed": [p["type"] for p in planted
                                if not any(match(x, p) for x in found)]})
    prec = tp / (tp + fp) if tp + fp else 1.0
    rec = tp / (tp + fn) if tp + fn else 1.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0

    def cls(c):
        d = per_class[c]
        p = d["tp"] / (d["tp"] + d["fp"]) if d["tp"] + d["fp"] else 1.0
        r = d["tp"] / (d["tp"] + d["fn"]) if d["tp"] + d["fn"] else 1.0
        return {"precision": round(p, 3), "recall": round(r, 3)}

    return {
        "notebooks": n_notebooks,
        "defects": {"tp": tp, "fp": fp, "fn": fn,
                    "precision": round(prec, 3), "recall": round(rec, 3), "f1": round(f1, 3)},
        "by_class": {"S_static": cls("S"), "E_executable": cls("E")},
        "decision_accuracy": round(decisions_ok / n_notebooks, 3) if n_notebooks else None,
        "rows": rows,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", default="dev")
    args = ap.parse_args()
    agent_dir = ROOT / "results" / args.run_id
    base_dir = agent_dir / "baseline"
    out = {}
    for label, d in (("agent", agent_dir), ("baseline", base_dir)):
        if d.exists() and any(d.glob("nb*.json")):
            out[label] = score_run(d)
    (agent_dir / "evaluation.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))

    print(f"{'':26} {'baseline':>10} {'vetta':>10}")
    def row(label, path):
        b = out.get("baseline", {})
        a = out.get("agent", {})
        get = lambda o: (o for _ in [0])
        bv = b
        av = a
        for k in path:
            bv = bv.get(k, {}) if isinstance(bv, dict) else {}
            av = av.get(k, {}) if isinstance(av, dict) else {}
        print(f"{label:26} {str(bv) if not isinstance(bv, dict) else '-':>10} {str(av) if not isinstance(av, dict) else '-':>10}")
    for label, path in [
        ("precision (defects)", ["defects", "precision"]),
        ("recall (defects)", ["defects", "recall"]),
        ("f1 (defects)", ["defects", "f1"]),
        ("recall class S (static)", ["by_class", "S_static", "recall"]),
        ("recall class E (exec-only)", ["by_class", "E_executable", "recall"]),
        ("decision accuracy", ["decision_accuracy"]),
    ]:
        row(label, path)
    print(f"\ndetail in {agent_dir / 'evaluation.json'}")


if __name__ == "__main__":
    main()
