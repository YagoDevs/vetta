"""Relator — monta o Verdict final por candidato.

Estrutura e decisao sao codigo deterministico (regras da rubrica); a LLM entra
apenas para redigir o paragrafo-resumo que a recrutadora le.
"""
import json

from core.models import ExecutionFacts, Finding, Verdict, decide, weighted_score

SYSTEM = """You write the executive summary of a technical evaluation for a recruiter
(medium technical knowledge). 3-5 sentences, clear English, no gratuitous jargon.
Say: overall quality, the most important finding (if any) in terms she will understand,
and what to verify in the interview. If role_requirements are present, say in one
sentence how well the candidate appears to meet what the role asks. Factual tone —
neither salesy nor alarmist.
Respond with JSON ONLY: {"summary": "..."}"""


def report(llm, facts: ExecutionFacts, findings: list[Finding],
           scores: dict, justs: dict, trajectory: list[dict],
           requirements: str = '') -> Verdict:
    decision = decide(scores, findings)
    user = json.dumps(
        {"notebook": facts.notebook, "decision": decision, "scores": scores,
         "justifications": justs,
         "findings": [f.to_dict() for f in findings],
         "role_requirements": requirements or "not provided"},
        ensure_ascii=False)
    resp = llm.complete(SYSTEM, user, tag=f"report_{facts.notebook}")
    summary = resp.get("summary", "")
    # registra o passo do reporter na trajetoria (trace do 4o agente)
    trajectory = trajectory + [{
        "agent": "reporter",
        "decision": decision,
        "weighted_score": weighted_score(scores),
        "summary": summary,
    }]
    return Verdict(
        notebook=facts.notebook,
        findings=findings,
        scores=scores,
        weighted_score=weighted_score(scores),
        decision=decision,
        summary=summary,
        trajectory=trajectory,
    )
