"""Modelos de dominio do Vetta — sem dependencia de infraestrutura."""
from dataclasses import dataclass, field, asdict


@dataclass
class CellExecution:
    index: int
    cell_type: str
    source: str
    outputs: list[str] = field(default_factory=list)
    error: str | None = None


@dataclass
class ExecutionFacts:
    """O que a execucao REAL do notebook produziu — a fundacao factual.

    Nenhum campo aqui vem de LLM; tudo e observado rodando o notebook.
    """
    notebook: str
    executed_ok: bool
    cells: list[CellExecution]
    printed_metrics: dict[str, float]          # ex.: {"AUC_TEST": 0.729}
    metrics_by_seed: dict[str, dict[str, float]]  # run "a"/"b" p/ detectar E3
    error_cells: list[int]
    duration_s: float

    def to_dict(self):
        return asdict(self)


@dataclass
class Finding:
    """Um defeito reportado pelo verificador, com evidencia."""
    type: str          # S1..S4, E1..E4
    cell: int
    claim: str         # o que o candidato declarou/fez
    evidence: str      # o fato executado que prova o defeito
    severity: str      # "critical" | "major" | "minor"

    def to_dict(self):
        return asdict(self)


@dataclass
class Verdict:
    """Saida final por candidato — o que o dashboard mostra."""
    notebook: str
    findings: list[Finding]
    scores: dict[str, int]         # C1..C4, 1-5
    weighted_score: float
    decision: str                  # AVANCAR | REVISAR | REPROVAR
    summary: str
    trajectory: list[dict]         # passos do agente p/ auditoria

    def to_dict(self):
        d = asdict(self)
        return d


RUBRIC_WEIGHTS = {"C1": 0.30, "C2": 0.20, "C3": 0.30, "C4": 0.20}


def weighted_score(scores: dict[str, int]) -> float:
    return round(sum(RUBRIC_WEIGHTS[k] * scores[k] for k in RUBRIC_WEIGHTS), 2)


def decide(scores: dict[str, int], findings: list[Finding]) -> str:
    """Regras de decisao deterministicas da RUBRIC.md — codigo, nao LLM."""
    ws = weighted_score(scores)
    if any(v == 1 for v in scores.values()) or ws < 2.5:
        return "REPROVAR"
    if ws < 3.5 or any(f.severity == "major" for f in findings) or any(v <= 2 for v in scores.values()):
        return "REVISAR"
    return "AVANCAR"
