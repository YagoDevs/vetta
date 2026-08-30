"""API do Vetta — camada fina de leitura sobre os artefatos do pipeline.

Nao contem logica de avaliacao: le results/<run_id>/*.json (gerados pelo
pipeline/baseline) e registra apenas a decisao humana final (regra 04/05 do
hackathon: nada avanca sem aprovacao humana).

Sobe com: .venv/bin/uvicorn api.main:app --port 8000
Serve tambem o frontend buildado (frontend/dist), se existir.
"""
import json
import re
import subprocess
import sys
import threading
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


_META_FILES = {"status.json", "human_decisions.json", "evaluation.json"}


def _verdict_files(d: Path) -> list[Path]:
    return sorted(f for f in d.glob("*.json") if f.name not in _META_FILES)


def _decisions_file(run_id: str) -> Path:
    return _run_dir(run_id) / "human_decisions.json"


def _human_decisions(run_id: str) -> dict:
    f = _decisions_file(run_id)
    return _load(f) if f.exists() else {}


@app.get("/api/runs")
def list_runs():
    runs = []
    for d in sorted(RESULTS.iterdir()):
        if d.is_dir() and _verdict_files(d):
            runs.append({"run_id": d.name,
                         "candidates": len(_verdict_files(d)),
                         "has_baseline": (d / "baseline").exists(),
                         "has_evaluation": (d / "evaluation.json").exists()})
    return runs


@app.get("/api/runs/{run_id}/candidates")
def candidates(run_id: str):
    d = _run_dir(run_id)
    human = _human_decisions(run_id)
    out = []
    for f in _verdict_files(d):
        v = _load(f)
        out.append({
            "id": f.stem,
            "decision": v["decision"],
            "weighted_score": v["weighted_score"],
            "scores": v["scores"],
            "summary": v["summary"],
            "critical_findings": [x["type"] for x in v["findings"]
                                  if x["severity"] == "critical"],
            "findings": [{"type": x["type"], "severity": x["severity"],
                          "claim": x["claim"][:140]} for x in v["findings"]],
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
    st = d / "status.json"
    nb_root = Path(_load(st).get("notebooks_path", NOTEBOOKS)) if st.exists() else NOTEBOOKS
    nb_file = nb_root / f"{cand_id}.ipynb"
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


# ---------------------------------------------------------- nova avaliacao
class NewEvaluation(BaseModel):
    name: str                 # vira o run_id (slug)
    notebooks_path: str       # pasta local com os .ipynb
    mode: str = "live"        # live | replay


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9_-]+", "-", name.lower()).strip("-") or "avaliacao"


def _status_file(run_id: str) -> Path:
    return RESULTS / run_id / "status.json"


def _pipeline_worker(run_id: str, nb_path: str, mode: str, total: int):
    st = _status_file(run_id)
    def write(state, extra=None):
        st.write_text(json.dumps({"state": state, "total": total, **(extra or {})}))
    try:
        write("running")
        py = sys.executable
        r = subprocess.run([py, str(ROOT / "vetta.py"), "run", nb_path,
                            "--mode", mode, "--run-id", run_id],
                           cwd=ROOT, capture_output=True, text=True, timeout=3600)
        if r.returncode != 0:
            write("error", {"error": r.stderr[-800:]})
            return
        subprocess.run([py, str(ROOT / "baseline.py"), nb_path,
                        "--mode", mode, "--run-id", run_id],
                       cwd=ROOT, capture_output=True, text=True, timeout=1800)
        write("done")
    except Exception as e:  # noqa: BLE001 — status precisa refletir qualquer falha
        write("error", {"error": str(e)[:800]})


@app.post("/api/evaluations")
def create_evaluation(body: NewEvaluation):
    nb_dir = Path(body.notebooks_path).expanduser()
    if not nb_dir.is_dir():
        raise HTTPException(422, f"pasta nao encontrada: {nb_dir}")
    notebooks = sorted(nb_dir.glob("*.ipynb"))
    if not notebooks:
        raise HTTPException(422, "nenhum .ipynb na pasta")
    run_id = _slug(body.name)
    if (RESULTS / run_id).exists() and _verdict_files(RESULTS / run_id):
        raise HTTPException(409, f"avaliacao '{run_id}' ja existe")
    (RESULTS / run_id).mkdir(parents=True, exist_ok=True)
    _status_file(run_id).write_text(json.dumps({"state": "starting",
                                                "total": len(notebooks),
                                                "notebooks_path": str(nb_dir)}))
    threading.Thread(target=_pipeline_worker,
                     args=(run_id, str(nb_dir), body.mode, len(notebooks)),
                     daemon=True).start()
    return {"run_id": run_id, "candidates": len(notebooks)}


@app.get("/api/runs/{run_id}/status")
def run_status(run_id: str):
    d = _run_dir(run_id)
    st = _status_file(run_id)
    status = _load(st) if st.exists() else {"state": "done", "total": None}
    status["completed"] = len(_verdict_files(d))
    return status


dist = ROOT / "frontend" / "dist"
if dist.exists():
    app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
