"""API do Vetta — camada fina de leitura sobre os artefatos do pipeline.

Nao contem logica de avaliacao: le results/<run_id>/*.json (gerados pelo
pipeline/baseline) e registra apenas a decisao humana final (regra 04/05 do
hackathon: nada avanca sem aprovacao humana).

Sobe com: .venv/bin/uvicorn api.main:app --port 8000
Serve tambem o frontend buildado (frontend/dist), se existir.
"""
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT / "results"
NOTEBOOKS = ROOT / "notebooks"

app = FastAPI(title="Vetta", version="0.1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
                   allow_headers=["*"])

DECISION_ORDER = {"REPROVAR": 0, "REVISAR": 1, "AVANCAR": 2}


def _run_dir(run_id: str) -> Path:
    d = RESULTS / run_id
    if not d.exists():
        raise HTTPException(404, f"run '{run_id}' nao encontrada")
    return d


def _load(path: Path) -> dict:
    return json.loads(path.read_text())


def _decisions_file(run_id: str) -> Path:
    return _run_dir(run_id) / "human_decisions.json"


def _human_decisions(run_id: str) -> dict:
    f = _decisions_file(run_id)
    return _load(f) if f.exists() else {}


@app.get("/api/runs")
def list_runs():
    runs = []
    for d in sorted(RESULTS.iterdir()):
        if d.is_dir() and any(d.glob("nb*.json")):
            runs.append({"run_id": d.name,
                         "candidates": len(list(d.glob("nb*.json"))),
                         "has_baseline": (d / "baseline").exists(),
                         "has_evaluation": (d / "evaluation.json").exists()})
    return runs


@app.get("/api/runs/{run_id}/candidates")
def candidates(run_id: str):
    d = _run_dir(run_id)
    human = _human_decisions(run_id)
    out = []
    for f in sorted(d.glob("nb*.json")):
        v = _load(f)
        out.append({
            "id": f.stem,
            "decision": v["decision"],
            "weighted_score": v["weighted_score"],
            "scores": v["scores"],
            "summary": v["summary"],
            "critical_findings": [x["type"] for x in v["findings"]
                                  if x["severity"] == "critical"],
            "n_findings": len(v["findings"]),
            "human_decision": human.get(f.stem),
        })
    out.sort(key=lambda c: (-DECISION_ORDER.get(c["decision"], 0),
                            -c["weighted_score"]))
    return out


@app.get("/api/runs/{run_id}/candidates/{cand_id}")
def candidate_detail(run_id: str, cand_id: str):
    d = _run_dir(run_id)
    f = d / f"{cand_id}.json"
    if not f.exists():
        raise HTTPException(404, "candidato nao encontrado")
    v = _load(f)
    nb_file = NOTEBOOKS / f"{cand_id}.ipynb"
    cells = []
    if nb_file.exists():
        nb = _load(nb_file)
        by_cell = {}
        for fi in v["findings"]:
            by_cell.setdefault(fi["cell"], []).append(fi)
        for i, c in enumerate(nb["cells"]):
            outs = []
            for o in c.get("outputs", []):
                if "text" in o:
                    outs.append("".join(o["text"])[:1000])
                elif o.get("output_type") == "error":
                    outs.append(f"ERROR {o.get('ename')}: {o.get('evalue')}")
                elif "data" in o and "text/plain" in o["data"]:
                    outs.append("".join(o["data"]["text/plain"])[:1000])
            cells.append({"index": i, "type": c["cell_type"],
                          "source": "".join(c["source"]),
                          "outputs": outs,
                          "findings": by_cell.get(i, [])})
    v["cells"] = cells
    v["human_decision"] = _human_decisions(run_id).get(cand_id)
    baseline_f = d / "baseline" / f"{cand_id}.json"
    v["baseline"] = _load(baseline_f) if baseline_f.exists() else None
    return v


class HumanDecision(BaseModel):
    decision: str  # AVANCAR | REVISAR | REPROVAR
    note: str = ""


@app.post("/api/runs/{run_id}/candidates/{cand_id}/decision")
def set_human_decision(run_id: str, cand_id: str, body: HumanDecision):
    if body.decision not in DECISION_ORDER:
        raise HTTPException(422, "decisao invalida")
    f = _decisions_file(run_id)
    data = _load(f) if f.exists() else {}
    data[cand_id] = {"decision": body.decision, "note": body.note}
    f.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    return {"ok": True, "recorded": data[cand_id]}


@app.get("/api/runs/{run_id}/comparison")
def comparison(run_id: str):
    f = _run_dir(run_id) / "evaluation.json"
    if not f.exists():
        raise HTTPException(404, "rode evaluate.py primeiro")
    return _load(f)


dist = ROOT / "frontend" / "dist"
if dist.exists():
    app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
