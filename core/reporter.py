"""Relator — monta o Verdict final por candidato.

Estrutura e decisao sao codigo deterministico (regras da rubrica); a LLM entra
apenas para redigir o paragrafo-resumo que a recrutadora le.
"""
import json

from core.models import ExecutionFacts, Finding, Verdict, decide, weighted_score

SYSTEM = """Voce redige o resumo executivo de uma avaliacao tecnica para uma recrutadora
(conhecimento tecnico medio). 3-5 frases, portugues claro, sem jargao gratuito.
Diga: qualidade geral, o achado mais importante (se houver) em termos que ela entenda,
e o que verificar na entrevista. Tom factual — nem vendedor, nem alarmista.
Responda APENAS JSON: {"summary": "..."}"""


def report(llm, facts: ExecutionFacts, findings: list[Finding],
           scores: dict, justs: dict, trajectory: list[dict]) -> Verdict:
    decision = decide(scores, findings)
    user = json.dumps(
        {"notebook": facts.notebook, "decisao": decision, "scores": scores,
         "justificativas": justs,
         "findings": [f.to_dict() for f in findings]},
        ensure_ascii=False)
    resp = llm.complete(SYSTEM, user, tag=f"report_{facts.notebook}")
    return Verdict(
        notebook=facts.notebook,
        findings=findings,
        scores=scores,
        weighted_score=weighted_score(scores),
        decision=decision,
        summary=resp.get("summary", ""),
        trajectory=trajectory,
    )
