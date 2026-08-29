# Rubrica de Avaliação — Case de Data Science (Churn)

> **Pré-registro**: esta rubrica foi escrita ANTES da primeira execução oficial dos
> agentes e da baseline (ver histórico do git). Ela é dada, idêntica, ao agente
> avaliador e à baseline.

Cada notebook recebe nota 1-5 em quatro critérios. A decisão sugerida deriva
das regras ao final — nunca de "impressão geral".

## C1 — Metodologia (peso 30%)
Split treino/teste correto e feito ANTES de qualquer fit/transform; validação
adequada (holdout ou CV); métrica apropriada para classe desbalanceada;
tratamento consciente dos dados sujos (datas mistas, decimais com vírgula,
categorias inconsistentes).

- **5**: split antes de tudo, sem vazamento; métrica justificada; sujeira tratada e documentada.
- **3**: metodologia essencialmente correta com descuidos menores (ex.: não estratificou).
- **1**: vazamento de dados (fit antes do split, target em feature, scaler no dataset inteiro) OU métrica enganosa (accuracy em base 95/5 sem discussão).

## C2 — Qualidade de código e execução (peso 20%)
O notebook executa de ponta a ponta, em ordem, com resultados estáveis.

- **5**: executa limpo; seeds fixadas; código legível.
- **3**: executa com warnings ou dependência de ordem de células; alguma repetição.
- **1**: célula lança exceção OU resultado muda materialmente entre execuções (seed não fixada com variação > 0.05 na métrica principal).

## C3 — Integridade dos resultados (peso 30%)
O que o candidato ESCREVE corresponde ao que o código PRODUZ.

- **5**: toda métrica citada no texto bate com o output executado (tolerância ±0.01).
- **3**: divergências pequenas (arredondamento, célula desatualizada) que não mudam a conclusão.
- **1**: métrica declarada diverge da real em >0.05 OU conclusão cita resultado que nenhuma célula produz.

## C4 — Conclusões e comunicação (peso 20%)
As conclusões são suportadas pelos números e respondem à pergunta de negócio.

- **5**: conclusões amarradas às evidências; limitações reconhecidas; recomendação acionável.
- **3**: conclusões razoáveis mas genéricas; pouca conexão com os números.
- **1**: conclusões contradizem os próprios resultados ou ignoram falha grave.

## Regras de decisão (determinísticas)
- **REPROVAR**: qualquer critério = 1 (defeito crítico), OU score ponderado < 2.5.
- **REVISAR**: score ponderado 2.5-3.4, OU divergência C3 não-crítica, OU só executável com correção trivial.
- **AVANÇAR**: score ponderado ≥ 3.5 e nenhum critério ≤ 2.

Score ponderado = 0.30·C1 + 0.20·C2 + 0.30·C3 + 0.20·C4.

## O que o avaliador NÃO julga
Estilo pessoal, escolha de biblioteca, se usou IA para escrever código
(assume-se que sim, como em 2026 é norma) — apenas julgamento, correção e
integridade.
