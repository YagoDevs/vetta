"""Verificador — o agente que confronta o que o candidato DECLAROU com o que
a execucao PRODUZIU.

Disciplina central: a LLM nunca inventa um fato. Ela recebe (a) o notebook
como o candidato entregou e (b) os fatos objetivos do Executor (metricas
reais, celulas com erro, drift entre seeds), e seu trabalho e interpretar e
casar as duas coisas. Cada finding aponta a celula e a evidencia executada.
"""
import json

from core.models import ExecutionFacts, Finding

SYSTEM = """You are a technical verifier of data science notebooks in hiring processes.
Your single job: find divergences between what the candidate CLAIMS (markdown, comments)
and what the code ACTUALLY PRODUCES (execution facts provided), plus methodology defects
visible in the code.

Defect types (use exactly these codes):
- S1: preprocessor fit/transform before the train/test split (data leakage)
- S2: feature built from the target itself
- S3: the NARRATIVE (markdown/conclusion) leans on a metric that is misleading for the
      problem (e.g. celebrating accuracy on an imbalanced base). Merely PRINTING several
      metrics in a code cell is NOT S3 — the defect is in the argument, not the print.
- S4: silent data loss (a parse/filter discards a relevant share of rows without reporting it)
- E1: metric claimed in the text diverges from the real executed metric (gap > 0.05)
- E2: a cell raises an exception on a clean run
- E3: the result depends on an unfixed seed (metric varies > 0.02 between the two runs)
- E4: a conclusion cites a number/result that NO cell computes

Rules:
1. Only report a defect with concrete evidence. When in doubt, do NOT report (false alarms are costly).
2. For E1/E4, compare markdown numbers against printed_metrics and real outputs.
   E1 ONLY if the absolute gap is > 0.05 — smaller divergences are not a defect.
   Special case: if seeds are NOT fixed and the claimed metric is within 0.05 of the
   range observed across the runs, the only defect is E3 — do not also report E1 or E4
   for that sentence (the divergence is a consequence of the missing seed).
3. For E3, compare metrics_by_seed run 'a' vs 'b'.
3b. ONE defect per claim — at most ONE finding per sentence of the conclusion.
    If the cited number does not exist in any cell, it is E4 (not E1: E1 requires a
    corresponding metric that exists and diverges). If a sentence is already E1 or E4,
    do NOT also report it as S3. S3 is for narrative leaning on a real-but-misleading
    metric (e.g. celebrating high accuracy on an imbalanced base). INTERPRETATION
    critique (coefficients are not causality, correlation vs causation, regularization
    distorts coefficients) is NOT S3 — that is style, not a defect. It is also NOT S3
    when the conclusion explicitly ACKNOWLEDGES the limitation (e.g. admits low recall
    and recommends threshold calibration) — acknowledging a limitation is the opposite
    of misleading.
3c. S4 (silent loss): the classic pattern is errors='coerce' (to_datetime/to_numeric)
    followed by dropna WITHOUT the code reporting the effect. It is NOT S4 if: (a) the
    code prints shape/row counts after cleaning (the loss is reported), or (b) the parse
    handles the messy format first (e.g. str.replace(',', '.') before to_numeric).
    Only report S4 when you can point to WHICH data format gets discarded and why the
    share is relevant.
4. severity: "critical" = invalidates the result (E1, S1, S2, E2 in an essential cell);
   "major" = undermines confidence (S3, S4, E3, E4); "minor" = cosmetic.
5. Respond with JSON ONLY: {"findings": [{"type","cell","claim","evidence","severity"}]}
   where cell is the 0-based index of the cell holding the defect (for E1/E4, the markdown cell).
Write claim and evidence in clear English.
"""


def _facts_digest(facts: ExecutionFacts) -> dict:
    return {
        "executed_ok": facts.executed_ok,
        "error_cells": [
            {"cell": c.index, "error": c.error} for c in facts.cells if c.error
        ],
        "printed_metrics_run_a": facts.metrics_by_seed["a"],
        "printed_metrics_run_b": facts.metrics_by_seed["b"],
        "cell_outputs": [
            {"cell": c.index, "outputs": [o[:500] for o in c.outputs]}
            for c in facts.cells if c.outputs
        ],
    }


def _notebook_view(facts: ExecutionFacts) -> list[dict]:
    return [{"cell": c.index, "type": c.cell_type, "source": c.source}
            for c in facts.cells]


def verify(llm, facts: ExecutionFacts) -> tuple[list[Finding], dict]:
    user = json.dumps(
        {"notebook_as_delivered": _notebook_view(facts),
         "execution_facts": _facts_digest(facts)},
        ensure_ascii=False)
    resp = llm.complete(SYSTEM, user, tag=f"verify_{facts.notebook}")
    findings = [
        Finding(
            type=f.get("type", "?"), cell=int(f.get("cell", -1)),
            claim=str(f.get("claim", "")), evidence=str(f.get("evidence", "")),
            severity=f.get("severity", "major"),
        )
        for f in resp.get("findings", [])
    ]
    step = {"agent": "verifier", "input_facts": _facts_digest(facts),
            "findings": [f.to_dict() for f in findings]}
    return findings, step
