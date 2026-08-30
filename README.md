<div align="center">

# vetta.

### Trust what runs, not what is written.

**Agentic triage for data-science take-home assessments. Every candidate claim is verified by _executing_ the code, not by reading it.**

Built solo in 3 days for the **micro1 Agentic Workflows Hackathon** (Aug 28 to 31, 2026).

`GPT-5.2 (pinned)` · `FastAPI + React/Vite/Tailwind` · `papermill sandbox` · `offline replay` · `12 planted defects · 3 official runs`

<img src="docs/screenshots/02-landing-full.png" width="820" alt="vetta landing page" />

</div>

---

## Table of contents

- [The problem in one paragraph](#the-problem-in-one-paragraph)
- [The thesis (and the hot take)](#the-thesis-and-the-hot-take)
- [The four questions the hackathon asks](#the-four-questions-the-hackathon-asks)
- [A visual tour of the product](#a-visual-tour-of-the-product)
- [Architecture](#architecture)
- [Safety: we run a stranger's code](#safety-we-run-a-strangers-code)
- [Measured improvement](#measured-improvement)
- [Improvement changelog](#improvement-changelog)
- [Limitations, main failure mode & hot take](#limitations-main-failure-mode--hot-take)
- [Scope & generalization](#scope--generalization)
- [Install & run](#install--run)
- [Reproduce the results](#reproduce-the-results)
- [What existed before vs. what we built](#what-existed-before-vs-what-we-built)
- [Agent trajectories](#agent-trajectories)

---

## The problem in one paragraph

A tech recruiter sends a data-science case to candidates and gets back a pile of Jupyter
notebooks. Today a senior data scientist spends **30 to 60 minutes per notebook**: running it,
checking whether the metrics in the write-up match what the code actually produces, hunting
for data leakage, judging the conclusions. With 20 candidates that becomes a **week of
expensive, inconsistent work**, and different reviewers disagree. It is the real bottleneck
between "assessments received" and "shortlist delivered".

The dangerous part is what makes this problem worth an agent:

> **A notebook can look great and still be wrong in ways reading cannot catch.**
> A claimed AUC that no cell reproduces. A result that changes on every run because no seed
> was fixed. A cell that only worked because of stale kernel state. Static review, whether by
> a human or an LLM, is blind to all of it.

## The thesis (and the hot take)

> There is a class of defects in analytical work that only **execution** reveals. An agent
> that re-runs the notebook and diffs _what was claimed_ against _what actually happens_
> catches them. A single strong LLM prompt reading the executed notebook does not.

We **pre-registered** that claim (rubric and defect taxonomy committed to git _before_ the
first run), built both systems, and measured it. The honest result turned out more interesting
than the pitch. See [Measured improvement](#measured-improvement).

---

## The four questions the hackathon asks

**01 · Who has this problem?**
Recruiters and hiring managers screening data-science take-homes. The user is non-technical
enough that "C3 = 1, finding E1" is useless to them, while "the candidate wrote AUC 0.93 but
the code produces 0.73" is exactly what they need. vetta is written for that reader.

**02 · What bottleneck makes it worth solving?**
Manual review is slow (30 to 60 min per notebook), inconsistent between reviewers, and,
critically, **blind to execution-only defects**. A senior can read ten notebooks and still
approve the one whose result silently changes every run. That specific blindness is what an
agent with a sandbox can remove.

**03 · Does the agent solve it well?**
It runs each notebook twice in a sandbox, verifies every written claim against the executed
output with cell-level evidence, scores a pre-registered rubric, and recommends a decision that
a human always makes final. Measured against a deliberately strong baseline on 12 planted
defects across 3 runs, it wins on defect recall and, more importantly, **never wrongly rejects
the honest candidate** (the baseline did, in 2 of 3 runs).

**04 · Can another person reproduce the result?**
Yes, from a clean clone, **offline and at zero cost**. `make reproduce` replays every recorded
model call and re-derives every number in this README. Data is synthetic and seeded; the model
is pinned to a dated snapshot. See [Reproduce](#reproduce-the-results).

---

## A visual tour of the product

### 1 · Landing, the pitch in one screen

<img src="docs/screenshots/01-landing-hero.png" width="820" alt="Landing hero" />

The marketing surface is intentionally dark and typographic (Space Grotesk with JetBrains
Mono). The hero states the thesis, and the status strip underneath commits to the facts that
matter to a judge: `papermill sandbox ×2`, `defect recall 0.94`, `replay 100% offline, zero
cost`, `GPT-5.2 pinned`. Scroll down and the page turns light for a live benchmark and the
pipeline breakdown, so it makes an argument rather than just a slogan.

### 2 · Creating an evaluation, a guided pipeline instead of a form

<img src="docs/screenshots/07-wizard-dropzone.png" width="760" alt="New-evaluation wizard: drag and drop" />

Clicking into the app opens a clean, light workspace (the micro1 palette) with a sidebar of
evaluations. Creating one is a full-screen, step-by-step wizard so a non-technical user never
faces a wall of fields: name the role, describe what a great candidate looks like (this profile
is fed to the assessor, so scoring is role-calibrated), then **drag and drop the `.ipynb` files
straight from Finder**. Each file is one candidate, and the pipeline runs with a live progress
bar (execute, verify, score, roughly 20 to 30 seconds per notebook).

### 3 · The queue, the whole batch at a glance

<img src="docs/screenshots/08-queue.png" width="820" alt="Ranked candidate queue" />

Every candidate is ranked, with a **plain-language summary**, the defects found in human words
("claimed number differs from real", not "E1"), four rubric scores as bars, and a recommendation
badge. The role profile sits in a banner at the top, filters split the batch by decision, and
**Export shortlist** produces a markdown file for the hiring manager. The final call is always
the recruiter's.

### 4 · The evidence conversation, where the thesis becomes visible

<img src="docs/screenshots/09-detail-conversation.png" width="820" alt="Evidence conversation" />

Opening a candidate is a **conversation**. vetta presents its findings as chat bubbles, and for
every problematic cell it embeds the actual code as a dark editor window with the claim, the
executed evidence, and the real output side by side. This is the money shot of the whole
project: for **Carla Mendes**, the conclusion says AUC 0.93; vetta ran the code and it is 0.73,
pinned to the exact cell. You record your decision, and you can ask the assistant anything. Its
answers are grounded strictly in the executed evidence, and a **What the agent did** view exposes
the full trajectory.

### 5 · Baseline vs. vetta, measured rather than claimed

<img src="docs/screenshots/10-comparison.png" width="820" alt="Baseline vs vetta comparison" />

The comparison tab is the honest scoreboard: the same notebooks, same model, same rubric,
baseline against agent, broken down by defect class and per candidate, including what each side
missed. No number in this README is unbacked by this screen.

### 6 · Safety, quarantine before execution

<img src="docs/screenshots/12-detail-quarantine.png" width="820" alt="Quarantine detail with flagged cells" />

We run code written by strangers, so before anything executes a **safety gate** screens every
cell. Here the fictional candidate _Mallory Hacker_ tries to reach the network, read SSH keys
and run obfuscated code. vetta quarantines the notebook: a red badge in the queue, a clear banner
in the detail view, and the flagged cells shown with the code but explicitly **not executed** and
never sent to the model.

> _The demo notebook is inert: the domain is RFC-2606 reserved, the encoded payload decodes to
> `print(1)`, and the gate blocks it before any cell runs. It exists only to demonstrate the
> gate._

---

## Architecture

A **pipeline** of four agents behind a thin FastAPI read-layer and a React dashboard. The core
is **hexagonal (ports & adapters)**, so the LLM can be swapped for an offline replay of recorded
calls without touching the logic. That swap is exactly what makes reproduction free.

```
 folder of candidate notebooks
          │
   ┌──────▼───────┐
   │ Safety gate  │  static scan, NO LLM. quarantine unsafe notebooks before they run
   └──────┬───────┘
   ┌──────▼───────┐
   │ [1] Executor │  runs the notebook TWICE in a sandbox, NO LLM
   │              │  -> real metrics, broken cells, seed sensitivity   (facts only)
   └──────┬───────┘
   ┌──────▼───────┐
   │ [2] Verifier │  LLM. diffs each candidate CLAIM against the executed FACTS
   │              │  -> findings, each pinned to a cell + evidence
   └──────┬───────┘
   ┌──────▼───────┐
   │ [3] Assessor │  LLM. scores the pre-registered rubric with findings on the table
   │              │  (judging is separated from hunting, on purpose)
   └──────┬───────┘
   ┌──────▼───────┐
   │ [4] Reporter │  deterministic decision rules + ONE LLM call for the plain-language summary
   └──────┬───────┘
          ▼
    results/*.json  ->  dashboard  (ranked queue · cell-level evidence · human decision)
```

**The one design rule that matters:** _the LLM never produces a fact_. Every number comes from
real execution; the model only interprets and judges facts the Executor measured. That is what
lets a finding say "the code prints 0.73" and be trusted.

| Layer | Tech | Files |
|---|---|---|
| Domain (no infra) | Python dataclasses, deterministic rules | `core/models.py`, `core/safety.py` |
| Agents | prompts + JSON contracts | `core/verifier.py`, `core/assessor.py`, `core/reporter.py` |
| Adapters (ports) | papermill/nbclient sandbox · OpenAI **live**/**replay** | `adapters/executor.py`, `adapters/llm.py` |
| CLI | one command per stage | `vetta.py`, `baseline.py`, `evaluate.py` |
| API | thin read-layer + upload + chat | `api/main.py` |
| Dashboard | React + Vite + Tailwind v4 | `frontend/` |

---

## Safety: we run a stranger's code

Executing candidate notebooks means running code from people we do not trust. Before a single
cell runs, a deterministic **safety gate** (`core/safety.py`, no LLM, because a security decision
must not depend on a model's mood) statically scans every code cell for behaviour a churn
take-home has no business exhibiting:

- **network** (`requests`, `socket`, `urllib`): could exfiltrate data
- **process/shell** (`subprocess`, `os.system`, `!curl`): arbitrary commands on the reviewer's machine
- **credentials** (`os.environ`, `.ssh`, `.env`, `id_rsa`): reading secrets
- **obfuscation** (`eval`/`exec`, `base64.b64decode`, `pickle.loads`): hides what actually runs
- **destructive filesystem** (`shutil.rmtree`, `os.remove`)

Any critical hit puts the notebook into **quarantine**: never executed, never sent to the model,
and a human reviews the flagged cells. This is the hackathon's "consequential actions in a
sandbox, with human approval" rule (04/05) implemented as a **feature, not a disclaimer**. False
positives are cheap here (a human looks), while false negatives are the expensive error, so the
gate errs toward blocking. Execution itself also runs in an isolated kernel process with per-cell
timeouts.

---

## Measured improvement

**Baseline (deliberately strong, not a strawman):** the _same model, same rubric, same defect
taxonomy_, a single prompt, given the notebook **with its executed outputs included**. The only
thing it lacks is vetta's process: independent re-execution, claim-vs-reality diffing, and the
dual-run seed check.

**Test set:** 8 synthetic candidate notebooks (named personas from Ana Ferreira to Henrique
Silva) generated by `scripts/build_notebooks.py` from a real telecom-churn case, with **12
planted defects** registered at injection time in `ground_truth/defects.json`. This is objective,
cell-level ground truth anyone can open and check. Three independent runs of each system
(`official_a/b/c`), mean reported:

| Metric (mean of 3 runs)              | Baseline | vetta | Δ |
|--------------------------------------|:--------:|:-----:|:--:|
| Defect detection **F1**              | 0.820    | **0.840** | +0.02 |
| Defect precision                     | 0.748    | **0.759** | +0.01 |
| Defect recall                        | 0.917    | **0.944** | +0.03 |
| Recall, **static** defects (S1 to S4)  | 1.000    | 1.000 | 0 |
| Recall, **execution-dependent** (E1 to E4) | 0.857 | **0.905** | +0.05 |
| **Seed-instability defect (E3) caught** | **0 / 3 runs** | **2 / 3 runs** | the irreducible gap |
| **Honest candidate wrongly rejected** | **2 / 3 runs** | **0 / 3 runs** | the costliest recruiter error |
| Decision accuracy                    | 0.917    | 0.917 | 0 |

**The honest headline: when the baseline is handed the executed outputs, reading recovers most
of the gap.** E1 (claimed vs. printed metric), E2 (error output in the file) and E4 (orphan
number) become readable once outputs are embedded, and we deliberately give them. What reading
can **never** recover is **E3, seed instability**: the delivered file shows one plausible number,
and only re-executing reveals that it moves. The baseline missed it in all 3 runs; vetta caught
it in 2. The second durable difference is **temperament**: the baseline's false alarms pushed it
to wrongly **reject the honest mid-level candidate in 2 of 3 runs**, while vetta's errors were
conservative (Advance to Review). For a recruiter, rejecting a good candidate is the most
expensive mistake a screener can make.

> For the record: the earlier Portuguese-prompt measurement (in git history) showed a wider gap
> (F1 0.853 vs 0.763). Translating prompts to English improved the _baseline_ far more than the
> agent, a lesson in benchmark fragility we report rather than hide.

---

## Improvement changelog

| Stage | What we tried and why | Evidence (same eval, 8 notebooks) | Decision / learning |
|---|---|---|---|
| **Baseline** | Single strong prompt, executed notebook included | F1 0.71 to 0.80; misses inflated metrics and seed instability; approved a candidate whose result changes every run | Established the thesis target: static reading has a blind spot |
| **Pipeline v1** | Executor, Verifier, Assessor, Reporter | Caught E1 with exact cell evidence, but flagged S3 on clean notebooks (printing accuracy is not the same as celebrating it) | Verifier taxonomy needed a sharper S3 definition |
| **Iteration 1** | S3 restricted to _narrative_ reliance on a misleading metric | Clean notebooks still flagged, and the verifier was RIGHT: our "gold" notebook overclaimed | Kept, and fixed the gold notebook instead of weakening the verifier. A good verifier audits your own test set |
| **Iteration 2** | Explicit finding-to-criterion map in the Assessor | Decision accuracy 8/8, clean notebooks 0 false positives | Kept. Separating hunting from judging only works if the mapping is explicit |
| **Iteration 3** | S4 hint (coerce+dropna), one-finding-per-claim, E1 gap threshold | Recall 1.0 both classes, but new pedantic false positives | Revised. Over-instructing creates zeal; every hunting hint needs its negative case |
| **Iteration 4** | Seedless special-case (drift means E3 only), acknowledged-limitation exemption | Froze the verifier | Final agent logic |
| **Removed** | Ranking correlation (Spearman) as the primary metric | not run | Dropped before implementation: N=8 ranking is noise and author-judged ranking is circular. Replaced by per-defect precision/recall vs. injection-time ground truth |
| **Iteration 5** | Replay keyed by call hash, then keyed by **stage tag** | `make reproduce` crashed on the unseeded notebook (fresh metrics, new hash, no recording) | Kept. Reproducibility must not depend on prompt or data stability; the full prompt stays recorded for audit |
| **Iteration 6** | English prompts + persona notebooks, official runs redone | Agent F1 0.853 to 0.840, baseline 0.763 to 0.820 | Kept, and reported. The durable advantages are E3 detection and candidate-friendly precision, not raw F1 |

---

## Limitations, main failure mode & hot take

**Limitations of the measurement** (we would rather state these than have a judge find them):

- **Author-judged benchmark.** The same person wrote the notebooks, planted the defects and built
  the agent. Mitigated by objective, cell-level ground truth registered at injection time (git
  proves the order), but not eliminated; the planned external Kaggle notebooks were cut for time.
- **Prompt tuned on the same 8 notebooks.** No held-out set, so read the per-class numbers as
  "on-distribution" performance.
- **Ground-truth label changes.** Two expected decisions were revised during development, both
  before the official runs and visible in git history.
- **Dual-run seed check can miss by luck.** In one run the unseeded notebook's two executions
  landed within the 0.02 threshold and E3 slipped through. More runs (N greater than 2) tighten
  this at proportional cost.

**Main failure mode:** spurious S3 ("misleading metric") on honest, well-caveated conclusions.
Both systems produce it; on the baseline it cascades into wrongly rejecting a good candidate.

**Hot take, two lessons:**
1. **Give an agent execution tools and it changes what it looks for.** Our early verifier trusted
   execution so much it read _less_ carefully than a reading-only model. The tool reshaped its
   attention.
2. **Every precision patch is a seesaw.** The iteration-4 rule that silenced false E1s on unseeded
   notebooks briefly reopened an S4 blind spot iteration 3 had fixed (visible in `results/dev*`).
   Every hunting rule needs its negative case, and every patch needs a regression check against the
   previous run.

---

## Scope & generalization

A fair question is what happens when the notebooks are about a different topic, or a different
kind of machine-learning problem entirely. The honest answer has two halves.

**What is topic-agnostic and works on any data-science notebook today:**

- **Executor, safety gate, dual-seed run and offline replay** know nothing about churn. They
  run any `.ipynb`.
- **The Verifier's thesis** ("does what was written match what executed?") holds in any domain.
  "The text claims R² 0.9, the code prints 0.6" is a defect in churn, in demand forecasting or
  in NLP alike.
- **The Assessor's rubric** (methodology, code, integrity, conclusions) is generic to data
  science, and the **role Profile** you fill in at creation time calibrates the rigor per case.

**What is coupled to the case format today, and is an explicit limitation:**

- **Metric extraction** in the Executor looks for a printed pattern like `AUC_TEST=0.729`. A
  notebook that surfaces its metric differently (for example `print(f"F1: {score}")`, or only a
  chart) is not captured automatically, which weakens the factual base the Verifier diffs
  against. Widening this parser, or asking candidates to print metrics in a known format, is the
  first thing to generalize.
- **The ground truth** (`defects.json`) is specific to the 8 churn notebooks. To _measure_ on a
  new topic you would need defects planted in that topic.

**A genuinely different ML task** (say the take-home is a RAG system or a fine-tune, not a churn
model) needs more than a config change: the defect taxonomy would need new entries (for example
"evaluated the LLM on the same prompt it was tuned on"). The **architecture** absorbs this,
swapping the rubric, the taxonomy and the metric pattern, but the current prompts were _tuned_
for the tabular case. That is precisely why the numbers above are labelled **on-distribution**:
adapting to a new domain is changing two config files, not rewriting the agent, yet measuring in
a new domain requires planting defects there, which we have not done.

---

## Install & run

**Prerequisites:** Python 3.12+, and Node 20+ only if you want to rebuild the dashboard (a built
copy is committed, so you can skip Node entirely).

```bash
git clone https://github.com/YagoDevs/vetta.git && cd vetta
make setup        # creates .venv and installs pinned requirements.txt
make serve        # dashboard + API at http://localhost:8000
```

That is all you need for the read-only experience. `make serve` reads the committed official
results, so the dashboard is fully browsable with **no API key**.

### Try it yourself in the app

The repo ships two folders of ready-to-use demo candidates:

- **`demo_candidates/`**: 4 clean and defective data-science notebooks (Ana, Carla, Elisa, Gabriela)
- **`demo_security/`**: the same, plus `mallory_hacker.ipynb` to see the safety gate quarantine in action

With `make serve` running and an `OPENAI_API_KEY` set, open http://localhost:8000, click
**Open app → + New evaluation**, name it and pick a profile, then **drag the `.ipynb` files
from one of those folders into the dropzone** and hit Start. Each file is one candidate; in a
couple of minutes the ranked queue appears. (No key? Just browse the committed `official_a/b/c`
evaluations already in the sidebar.)

Or run the same thing from the CLI:

```bash
cp .env.example .env      # put your OPENAI_API_KEY inside (never committed)
python vetta.py run <folder> --mode live --run-id my_eval
python baseline.py <folder> --mode live --run-id my_eval
python evaluate.py --run-id my_eval
```

Model pinned to the dated snapshot `gpt-5.2-2025-12-11` (`adapters/llm.py`).

---

## Reproduce the results

Full guide in **[REPRODUCE.md](REPRODUCE.md)**. The short version, from a clean clone:

```bash
make setup
make reproduce    # OFFLINE replay of the 3 official runs + evaluation.
                  # no API key, zero cost, ~2 min, re-derives every number above
make serve        # browse the same results in the dashboard
```

`make reproduce` replays the recorded model calls in `runs/official_*/calls/` through the full
pipeline. Because replay is keyed by stage tag rather than prompt hash, it is immune to prompt
edits and to the unseeded notebook's drift. `make rerun` repeats everything **live** with your
own key (~US$2, ~20 min); LLM non-determinism moves the numbers by about 0.05, but the
qualitative signature (the baseline never catching the seed-instability defect while vetta usually
does) held in every run we performed.

| Path | Needs key | Cost | Time |
|---|:---:|:---:|:---:|
| `make reproduce` + `make serve` | no | 0 | ~3 min |
| `make smoke` (1 notebook live) | yes | ~US$0.05 | 30 s |
| `make rerun` (3 fresh runs) | yes | ~US$2 | ~20 min |

---

## What existed before vs. what we built

**Pre-existing:** the OpenAI API and SDK, papermill/nbclient, FastAPI, React/Vite/Tailwind, and a
telecom-churn case previously solved by the author (inspiration for the synthetic data generator).

**Built during the hackathon:** the entire pipeline and agents' instructions, the safety gate, the
defect taxonomy and rubric, the notebook/defect injection scripts, the evaluation harness, the
live/replay LLM infrastructure, the FastAPI layer with drag-and-drop upload and evidence-grounded
chat, and the whole dashboard. Existing AI review platforms (CodeSubmit, HackerRank AI review)
score submissions by static analysis; none we found **executes the notebook and diffs the claims**.
That angle is the contribution.

## Agent trajectories

Every agent's trajectory is committed inside each verdict (`results/official_*/<candidate>.json`,
`trajectory` field) and browsable in the dashboard via the **What the agent did** view: executor
facts, verifier findings, assessor scores, reporter summary. Every raw LLM call, with its full
prompt, lives in `runs/official_*/calls/`, which is also what powers the offline replay.

<div align="center">

**Stop grading prose. Grade execution.**

</div>
