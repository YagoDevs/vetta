# Taxonomia de Defeitos — ground truth objetivo

> **Pré-registro**: taxonomia definida antes de qualquer run oficial. Cada
> notebook de teste tem seus defeitos listados em `ground_truth/defects.json`,
> gerados pelo script de injeção (`scripts/inject_defects.py`) — verificáveis
> por qualquer pessoa abrindo a célula citada.

A tese do projeto: as classes **E** (executáveis) são invisíveis para leitura
estática — só aparecem rodando o notebook. As classes **S** (estáticas) são
visíveis no código. Medimos precision/recall POR CLASSE, baseline vs. agente.

## Classe S — detectáveis por leitura estática
| id | defeito | exemplo plantado |
|----|---------|------------------|
| S1 | Leakage: fit/transform antes do split | `scaler.fit(X)` no dataset inteiro, depois split |
| S2 | Leakage: feature derivada do target | `df['risk'] = df.churned * df.monthly_charges` |
| S3 | Métrica enganosa | accuracy 0.95 celebrada em base com 5% de churn, sem discutir desbalanceamento |
| S4 | Sujeira ignorada silenciosamente | `pd.to_numeric(errors='coerce')` descartando 30% das linhas sem menção |

## Classe E — detectáveis apenas por execução
| id | defeito | exemplo plantado |
|----|---------|------------------|
| E1 | Métrica declarada ≠ métrica real | markdown diz "AUC 0.94"; execução produz 0.71 (gap sempre > 0.15) |
| E2 | Célula quebra em execução limpa | variável definida numa célula deletada; funciona só no estado antigo do kernel |
| E3 | Resultado dependente de seed | sem random_state; métrica varia > 0.05 entre duas execuções |
| E4 | Conclusão órfã | texto cita "recall de 0.80 no segmento prepaid"; nenhuma célula computa isso |

## Regras de pontuação da detecção
- **Acerto (TP)**: o sistema reporta o defeito com o tipo correto E aponta a célula certa (±1 célula).
- **Alarme falso (FP)**: reporta defeito que não está em `defects.json` — conferido manualmente; se for defeito real não plantado, vira TP documentado (os notebooks públicos do Kaggle podem ter defeitos genuínos).
- **Perda (FN)**: defeito plantado não reportado.
- Métricas: precision, recall e F1 — global e por classe (S vs. E).

## Distribuição planejada nos notebooks de teste
8 notebooks sintéticos: 2 limpos (controle de alarme falso — nb01 "forte" e
nb02 "mediano honesto"), 6 com 2-4 defeitos cada, misturando classes S e E,
com decisão correta derivada da rubrica. + 1-2 notebooks públicos (Kaggle,
licença aberta) avaliados sem gabarito plantado, para validade externa.
Total alvo: ~18-22 defeitos plantados.
