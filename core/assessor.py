"""Avaliador — pontua o notebook contra a rubrica, com os findings ja na mesa.

Separado do Verificador de proposito: um agente caca defeitos, o outro julga.
O Avaliador recebe a rubrica integral, o notebook e os findings verificados —
ele nao re-litiga os fatos, ele os pesa.
"""
import json
from pathlib import Path

from core.models import ExecutionFacts, Finding

RUBRIC_PATH = Path(__file__).resolve().parent.parent / "ground_truth" / "RUBRIC.md"

SYSTEM_TMPL = """Voce e um avaliador senior de cases de data science em processos seletivos.
Pontue o notebook abaixo contra a rubrica, criterio por criterio.

REGRAS:
1. Os "findings verificados" sao fatos confirmados por execucao — voce DEVE incorpora-los
   (ex.: um E1 critical implica C3 = 1 pela rubrica; um S1 implica C1 = 1).
2. Nao invente defeitos novos: seu papel e julgar, nao cacar.
2b. Mapa finding -> criterio (aplique exatamente):
    S1, S2          -> C1 = 1 (leakage e critico de metodologia)
    E2 critical      -> C2 = 1; E3 -> C2 <= 2
    E1 critical      -> C3 = 1; E1 minor -> C3 <= 3
    E4              -> C4 <= 2; S3 -> C4 <= 2 (o problema esta na narrativa)
    S4              -> C1 <= 2
    Um finding de um tipo NAO rebaixa criterios de outros tipos: sem E1/E4,
    C3 reflete apenas se numeros declarados batem com executados (>=4 se batem).
3. Justifique cada nota em 1-2 frases citando celulas.
4. Responda APENAS JSON:
   {"scores": {"C1": n, "C2": n, "C3": n, "C4": n},
    "justifications": {"C1": "...", "C2": "...", "C3": "...", "C4": "..."}}
   com n inteiro de 1 a 5.

RUBRICA:
{rubric}
"""


def assess(llm, facts: ExecutionFacts, findings: list[Finding]) -> tuple[dict, dict, dict]:
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
        },
        ensure_ascii=False)
    resp = llm.complete(system, user, tag=f"assess_{facts.notebook}")
    scores = {k: max(1, min(5, int(v))) for k, v in resp.get("scores", {}).items()}
    for c in ("C1", "C2", "C3", "C4"):
        scores.setdefault(c, 3)
    justs = resp.get("justifications", {})
    step = {"agent": "assessor", "scores": scores, "justifications": justs}
    return scores, justs, step
