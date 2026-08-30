"""Executor — roda o notebook do candidato em sandbox e extrai fatos.

Sem LLM: fatos vem de execucao real. Sandbox: processo de kernel proprio,
timeout por celula, working dir controlado. Roda DUAS vezes (runs 'a' e 'b')
para detectar resultado dependente de seed (defeito E3): se o candidato fixou
seeds, as metricas batem; se nao, divergem.
"""
import re
import time
from pathlib import Path

import nbformat as nbf
from nbclient import NotebookClient

from core.models import CellExecution, ExecutionFacts
from core.safety import is_quarantined, scan_cells

METRIC_PAT = re.compile(r"([A-Z][A-Z_]+)=([0-9.]+)")
CELL_TIMEOUT = 120


def _cell_outputs(cell) -> tuple[list[str], str | None]:
    outs, err = [], None
    for o in cell.get("outputs", []):
        if o.get("output_type") == "error":
            err = f"{o.get('ename')}: {o.get('evalue')}"
        elif "text" in o:
            outs.append(o["text"])
        elif "data" in o and "text/plain" in o["data"]:
            outs.append("".join(o["data"]["text/plain"]))
    return outs, err


def _run_once(path: Path) -> tuple[list[CellExecution], dict[str, float]]:
    nb = nbf.read(path, as_version=4)
    for c in nb.cells:  # execucao limpa: descarta outputs entregues
        if c.cell_type == "code":
            c.outputs, c.execution_count = [], None
    client = NotebookClient(
        nb, timeout=CELL_TIMEOUT, kernel_name="python3", allow_errors=True,
        resources={"metadata": {"path": str(path.parent)}},
    )
    client.execute()
    cells, metrics = [], {}
    for i, c in enumerate(nb.cells):
        outs, err = _cell_outputs(c) if c.cell_type == "code" else ([], None)
        cells.append(CellExecution(i, c.cell_type, c.source, outs, err))
        for text in outs:
            for name, val in METRIC_PAT.findall(text):
                try:
                    metrics[name] = float(val)
                except ValueError:
                    pass
    return cells, metrics


def safety_scan(path: Path):
    """Gate estatico: roda ANTES de qualquer execucao de codigo do candidato."""
    nb = nbf.read(path, as_version=4)
    code_cells = [(i, c.source) for i, c in enumerate(nb.cells) if c.cell_type == "code"]
    flags = scan_cells(code_cells)
    cells = [CellExecution(i, c.cell_type, c.source, [], None) for i, c in enumerate(nb.cells)]
    return flags, cells


def execute_notebook(path: Path) -> ExecutionFacts:
    t0 = time.time()
    flags, static_cells = safety_scan(path)
    if is_quarantined(flags):
        # nao executa: devolve fatos estaticos + flags; o pipeline quarentena
        facts = ExecutionFacts(
            notebook=path.name, executed_ok=False, cells=static_cells,
            printed_metrics={}, metrics_by_seed={"a": {}, "b": {}},
            error_cells=[], duration_s=round(time.time() - t0, 1),
        )
        facts.safety_flags = [f.to_dict() for f in flags]
        return facts
    cells_a, metrics_a = _run_once(path)
    _, metrics_b = _run_once(path)  # segunda run p/ sensibilidade a seed
    error_cells = [c.index for c in cells_a if c.error]
    facts = ExecutionFacts(
        notebook=path.name,
        executed_ok=not error_cells,
        cells=cells_a,
        printed_metrics=metrics_a,
        metrics_by_seed={"a": metrics_a, "b": metrics_b},
        error_cells=error_cells,
        duration_s=round(time.time() - t0, 1),
    )
    facts.safety_flags = [f.to_dict() for f in flags]
    return facts
