"""Baseline forte — um unico prompt com o notebook JA EXECUTADO colado.

Deliberadamente NAO e um espantalho: a baseline recebe o mesmo modelo, a mesma
rubrica, a mesma taxonomia de defeitos e o notebook com outputs incluidos.
O que ela nao tem e o PROCESSO do Vetta: re-execucao independente, diff
declarado-vs-real e segunda run para sensibilidade a seed.

Uso: python baseline.py notebooks/ --mode live --run-id official_a
"""
import argparse
import json
import sys
import time
from pathlib import Path

import nbformat as nbf

from adapters.llm import make_client
from core.models import Finding, decide, weighted_score

ROOT = Path(__file__).resolve().parent
RUBRIC = (ROOT / "ground_truth" / "RUBRIC.md").read_text()

SYSTEM = f"""Voce e um avaliador senior de cases de data science em processos seletivos.
Avalie o notebook entregue pelo candidato (fornecido COM os outputs executados).

Tipos de defeito (use exatamente estes codigos):
- S1: fit/transform de preprocessador antes do split (leakage)
- S2: feature construida a partir do proprio target
- S3: a narrativa se apoia em metrica enganosa (ex.: accuracy em base desbalanceada)
- S4: perda silenciosa de dados (parse/filtro descarta fatia relevante sem reportar)
- E1: metrica declarada no texto diverge da real (gap > 0.05)
- E2: celula quebraria em execucao limpa
- E3: resultado depende de seed nao fixada
- E4: conclusao cita numero que nenhuma celula computa

So reporte defeito com evidencia concreta; na duvida, nao reporte.

Pontue tambem os criterios C1-C4 da rubrica abaixo (inteiros 1-5).

RUBRICA:
{RUBRIC}

Responda APENAS JSON:
{{"findings": [{{"type","cell","claim","evidence","severity"}}],
  "scores": {{"C1": n, "C2": n, "C3": n, "C4": n}},
  "summary": "..."}}
"""


def notebook_as_delivered(path: Path) -> list[dict]:
    nb = nbf.read(path, as_version=4)
    view = []
    for i, c in enumerate(nb.cells):
        outs = []
        for o in c.get("outputs", []):
            if "text" in o:
                outs.append(o["text"][:500])
            elif o.get("output_type") == "error":
                outs.append(f"ERROR {o.get('ename')}: {o.get('evalue')}")
            elif "data" in o and "text/plain" in o["data"]:
                outs.append("".join(o["data"]["text/plain"])[:500])
        view.append({"cell": i, "type": c.cell_type, "source": c.source, "outputs": outs})
    return view


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("notebooks", type=Path)
    ap.add_argument("--mode", choices=["live", "replay"], default="replay")
    ap.add_argument("--run-id", default="dev")
    args = ap.parse_args()

    run_dir = ROOT / "runs" / args.run_id / "baseline_calls"
    out_dir = ROOT / "results" / args.run_id / "baseline"
    out_dir.mkdir(parents=True, exist_ok=True)
    llm = make_client(args.mode, run_dir)
    for path in sorted(args.notebooks.glob("*.ipynb")):
        t0 = time.time()
        user = json.dumps({"notebook_entregue": notebook_as_delivered(path)}, ensure_ascii=False)
        resp = llm.complete(SYSTEM, user, tag=f"baseline_{path.name}")
        findings = [Finding(f.get("type", "?"), int(f.get("cell", -1)),
                            str(f.get("claim", "")), str(f.get("evidence", "")),
                            f.get("severity", "major"))
                    for f in resp.get("findings", [])]
        scores = {k: max(1, min(5, int(v))) for k, v in resp.get("scores", {}).items()}
        for c in ("C1", "C2", "C3", "C4"):
            scores.setdefault(c, 3)
        verdict = {
            "notebook": path.name,
            "findings": [f.to_dict() for f in findings],
            "scores": scores,
            "weighted_score": weighted_score(scores),
            "decision": decide(scores, findings),
            "summary": resp.get("summary", ""),
        }
        (out_dir / f"{path.stem}.json").write_text(
            json.dumps(verdict, indent=2, ensure_ascii=False))
        print(f"  {path.stem}: {verdict['decision']} (score {verdict['weighted_score']}) "
              f"{len(findings)} findings [{time.time()-t0:.0f}s]")
    print(f"baseline em {out_dir}/")


if __name__ == "__main__":
    sys.exit(main())
