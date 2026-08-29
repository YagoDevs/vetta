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


def execute_notebook(path: Path) -> ExecutionFacts:
    t0 = time.time()
    cells_a, metrics_a = _run_once(path)
    _, metrics_b = _run_once(path)  # segunda run p/ sensibilidade a seed
    error_cells = [c.index for c in cells_a if c.error]
    return ExecutionFacts(
        notebook=path.name,
        executed_ok=not error_cells,
        cells=cells_a,
        printed_metrics=metrics_a,
        metrics_by_seed={"a": metrics_a, "b": metrics_b},
        error_cells=error_cells,
        duration_s=round(time.time() - t0, 1),
    )
