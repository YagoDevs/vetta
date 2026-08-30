"""Avaliador — pontua o notebook contra a rubrica, com os findings ja na mesa.

Separado do Verificador de proposito: um agente caca defeitos, o outro julga.
O Avaliador recebe a rubrica integral, o notebook e os findings verificados —
ele nao re-litiga os fatos, ele os pesa.
"""
import json
from pathlib import Path

from core.models import ExecutionFacts, Finding

RUBRIC_PATH = Path(__file__).resolve().parent.parent / "ground_truth" / "RUBRIC.md"

SYSTEM_TMPL = """You are a senior assessor of data science cases in hiring processes.
Score the notebook below against the rubric, criterion by criterion.

RULES:
1. The "verified findings" are facts confirmed by execution — you MUST incorporate them
   (e.g. a critical E1 implies C3 = 1 per the rubric; an S1 implies C1 = 1).
2. Do not invent new defects: your role is to judge, not to hunt.
2b. Finding -> criterion map (apply exactly):
    S1, S2          -> C1 = 1 (leakage is a critical methodology failure)
    E2 critical      -> C2 = 1; E3 -> C2 <= 2
    E1 critical      -> C3 = 1; E1 minor -> C3 <= 3
    E4              -> C4 <= 2; S3 -> C4 <= 2 (the problem lives in the narrative)
    S4              -> C1 <= 2
    A finding of one type does NOT drag down criteria of other types: with no E1/E4,
    C3 only reflects whether claimed numbers match executed ones (>= 4 if they match).
3. Justify each score in 1-2 sentences citing cells, in clear English.
3b. If "role_requirements" are present (what the role demands the candidate master),
    use them to calibrate rigor: a requirement listed there and executed poorly weighs
    more on the corresponding criterion; strengths aligned with the requirements
    deserve a mention in the justification.
4. Respond with JSON ONLY:
   {"scores": {"C1": n, "C2": n, "C3": n, "C4": n},
    "justifications": {"C1": "...", "C2": "...", "C3": "...", "C4": "..."}}
   with n an integer from 1 to 5.

RUBRIC:
{rubric}
"""


def assess(llm, facts: ExecutionFacts, findings: list[Finding], requirements: str = '') -> tuple[dict, dict, dict]:
    system = SYSTEM_TMPL.replace("{rubric}", RUBRIC_PATH.read_text())
    user = json.dumps(
        {
            "notebook": [
                {"cell": c.index, "type": c.cell_type, "source": c.source,
                 "outputs": [o[:300] for o in c.outputs], "error": c.error}
                for c in facts.cells
            ],
            "findings_verificados": [f.to_dict() for f in findings],
            "metricas_reais": facts.printed_metrics,
            "role_requirements": requirements or "not provided",
        },
        ensure_ascii=False)
    resp = llm.complete(system, user, tag=f"assess_{facts.notebook}")
    scores = {k: max(1, min(5, int(v))) for k, v in resp.get("scores", {}).items()}
    for c in ("C1", "C2", "C3", "C4"):
        scores.setdefault(c, 3)
    justs = resp.get("justifications", {})
    step = {"agent": "assessor", "scores": scores, "justifications": justs}
    return scores, justs, step
