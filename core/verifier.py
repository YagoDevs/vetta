"""Verificador — o agente que confronta o que o candidato DECLAROU com o que
a execucao PRODUZIU.

Disciplina central: a LLM nunca inventa um fato. Ela recebe (a) o notebook
como o candidato entregou e (b) os fatos objetivos do Executor (metricas
reais, celulas com erro, drift entre seeds), e seu trabalho e interpretar e
casar as duas coisas. Cada finding aponta a celula e a evidencia executada.
"""
import json

from core.models import ExecutionFacts, Finding

SYSTEM = """Voce e um verificador tecnico de notebooks de data science em processos seletivos.
Sua unica funcao: encontrar divergencias entre o que o candidato DECLARA (markdown, comentarios)
e o que o codigo REALMENTE PRODUZ (fatos de execucao fornecidos), alem de defeitos de metodologia
visiveis no codigo.

Tipos de defeito (use exatamente estes codigos):
- S1: fit/transform de preprocessador antes do train/test split (data leakage)
- S2: feature construida a partir do proprio target
- S3: a NARRATIVA (markdown/conclusao) se apoia numa metrica enganosa p/ o problema
      (ex.: celebrar accuracy em base desbalanceada). Apenas IMPRIMIR varias metricas em
      celula de codigo NAO e S3 — o defeito esta no argumento, nao no print.
- S4: perda silenciosa de dados (parse/filtro descarta fatia relevante sem reportar)
- E1: metrica declarada no texto diverge da metrica real executada (gap > 0.05)
- E2: celula lanca excecao em execucao limpa
- E3: resultado depende de seed nao fixada (metrica varia > 0.02 entre as duas runs)
- E4: conclusao cita numero/resultado que NENHUMA celula computa

Regras:
1. So reporte defeito com evidencia concreta. Na duvida, NAO reporte (alarmes falsos custam caro).
2. Para E1/E4, compare numeros do markdown com printed_metrics e outputs reais.
3. Para E3, compare metrics_by_seed run 'a' vs 'b'.
4. severity: "critical" = invalida o resultado (E1, S1, S2, E2 em celula essencial);
   "major" = compromete confianca (S3, S4, E3, E4); "minor" = cosmetico.
5. Responda APENAS JSON: {"findings": [{"type","cell","claim","evidence","severity"}]}
   onde cell e o indice 0-based da celula onde o defeito esta (para E1/E4, a celula do markdown).
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
        {"notebook_como_entregue": _notebook_view(facts),
         "fatos_de_execucao": _facts_digest(facts)},
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
