# Scoring Rubric — Data Science Case (Churn)

> **Pre-registration**: this rubric was written BEFORE the first official run of the
> agents and the baseline (see git history; originally authored in Portuguese and
> translated verbatim, same criteria and thresholds). It is given, identically, to the
> assessor agent and to the baseline.

Each notebook receives a 1-5 score on four criteria. The suggested decision derives
from the rules at the end — never from "overall impression".

## C1 — Methodology (weight 30%)
Train/test split done correctly and BEFORE any fit/transform; adequate validation
(holdout or CV); appropriate metric for an imbalanced class; conscious handling of
the messy data (mixed date formats, comma decimals, inconsistent categories).

- **5**: split before everything, no leakage; metric justified; messiness handled and documented.
- **3**: essentially correct methodology with minor slips (e.g. did not stratify).
- **1**: data leakage (fit before split, target in a feature, scaler on the full dataset) OR a misleading metric (accuracy on a 95/5 base with no discussion).

## C2 — Code quality and execution (weight 20%)
The notebook runs end to end, in order, with stable results.

- **5**: runs clean; seeds fixed; readable code.
- **3**: runs with warnings or cell-order dependence; some repetition.
- **1**: a cell raises an exception OR the result changes materially between runs (unfixed seed with > 0.05 variation on the main metric).

## C3 — Integrity of results (weight 30%)
What the candidate WRITES matches what the code PRODUCES.

- **5**: every metric cited in the text matches the executed output (±0.01 tolerance).
- **3**: small divergences (rounding, stale cell) that do not change the conclusion.
- **1**: claimed metric diverges from the real one by >0.05 OR a conclusion cites a result no cell produces.

## C4 — Conclusions and communication (weight 20%)
The conclusions are supported by the numbers and answer the business question.

- **5**: conclusions tied to evidence; limitations acknowledged; actionable recommendation.
- **3**: reasonable but generic conclusions; weak connection to the numbers.
- **1**: conclusions contradict the candidate's own results or ignore a serious failure.

## Decision rules (deterministic)
- **REJECT (REPROVAR)**: any criterion = 1 (critical defect), OR weighted score < 2.5.
- **REVIEW (REVISAR)**: weighted score 2.5-3.4, OR non-critical C3 divergence, OR only an executable defect with a trivial fix.
- **ADVANCE (AVANCAR)**: weighted score ≥ 3.5 and no criterion ≤ 2.

Weighted score = 0.30·C1 + 0.20·C2 + 0.30·C3 + 0.20·C4.

## What the assessor does NOT judge
Personal style, library choice, whether AI was used to write code (assumed yes, as is
the norm in 2026) — only judgment, correctness and integrity.
