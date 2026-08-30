import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------- vocabulary
const DECISION_LABEL = { AVANCAR: 'Advance', REVISAR: 'Review', REPROVAR: 'Reject', QUARANTINE: 'Quarantined' }
const VERDICT_STYLE = {
  AVANCAR: 'bg-pass-soft text-pass',
  REVISAR: 'bg-warn-soft text-warn',
  REPROVAR: 'bg-fail-soft text-fail',
  QUARANTINE: 'bg-fail text-white',
}
const DEFECT_LABEL = {
  S1: 'Data leakage: the model "saw" the test answers during training, so its real score is lower than it looks',
  S2: 'Accidental cheating: used the answer itself (churn) to build a model feature',
  S3: 'Misleading number: celebrates a metric that looks good but does not mean quality for this problem',
  S4: 'Silently dropped data: the cleaning threw away a large share of rows without saying so',
  E1: 'The number they wrote is not what the code produces: we ran it and the real result is different',
  E2: 'The code breaks: a cell raises an error when the notebook runs from scratch',
  E3: 'Unstable result: it changes on every run because randomness was never fixed',
  E4: 'Unsourced conclusion: cites a result that no part of the code computes',
  SEC: 'Security: this code tries to do something a take-home analysis never needs (network, shell, credentials). Nothing was executed.',
}
const DEFECT_SHORT = {
  S1: 'data leakage', S2: 'uses the answer as a hint', S3: 'misleading number',
  S4: 'silently dropped data', E1: 'claimed number differs from real',
  E2: 'code breaks', E3: 'unstable result', E4: 'unsourced conclusion',
  SEC: 'security flag',
}
const CRITERIA = {
  C1: ['Methodology', 'is the analysis conducted in a technically sound way?'],
  C2: ['Code', 'does the notebook run start to finish with a stable result?'],
  C3: ['Integrity', 'do the written numbers match what the code produces?'],
  C4: ['Conclusions', 'is what they conclude supported by the results?'],
}

const prettyName = id => id
  .replace(/\.ipynb$/, '')
  .replace(/^nb\d+[_-]/, '')
  .replace(/[_-]+/g, ' ')
  .trim()
  .replace(/\b\w/g, ch => ch.toUpperCase())

const Badge = ({ decision }) => (
  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest ${VERDICT_STYLE[decision] || ''}`}>
    {DECISION_LABEL[decision] || decision}
  </span>
)

// ================================================================= LANDING
// Porta fiel de run-and-trust/src/routes/index.tsx
const STAGES = [
  { n: '01', name: 'Executor', kind: 'no LLM',
    body: 'Runs the notebook twice in an isolated sandbox. Captures real metrics, broken cells, stale kernel state and seed sensitivity as objective facts.' },
  { n: '02', name: 'Verifier', kind: 'grounded',
    body: 'Cross-checks every claim the candidate wrote against what execution actually produced, pinning each defect to the exact cell with evidence.' },
  { n: '03', name: 'Assessor', kind: 'rubric',
    body: 'Scores a pre-registered rubric (Methodology, Code, Integrity, Conclusions) calibrated by the role profile you defined.' },
  { n: '04', name: 'Reporter', kind: 'verdict',
    body: 'Composes a plain-language verdict a recruiter can act on. The model never invents a fact; it only interprets what ran.' },
]

const BENCH = [
  { label: 'Overall F1', vetta: 0.84, base: 0.82, note: '12 planted defects, 3 official runs' },
  { label: 'Seed-instability defect caught (E3)', vetta: 0.667, base: 0.0, note: 'invisible to any reader, only re-execution shows it' },
]

function Bar({ name, value, strong }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className={strong ? 'font-semibold' : 'text-app-muted'}>{name}</span>
        <span className={`font-mono ${strong ? 'text-primary' : 'text-app-muted'}`}>
          {value.toFixed(3)}
        </span>
      </div>
      <div className="h-2 w-full bg-app-border/60">
        <div className={`h-full ${strong ? 'bg-primary' : 'bg-app-muted/40'}`}
             style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  )
}

function Landing({ onStart }) {
  return (
    <div className="bg-ink text-foreground selection:bg-primary selection:text-primary-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-ink-line bg-ink/70 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-bold tracking-tight">
            vetta<span className="text-primary">.</span>
          </span>
          <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            <a href="#pipeline" className="transition-colors hover:text-foreground">
              Pipeline
            </a>
            <a href="#benchmark" className="hidden transition-colors hover:text-foreground sm:block">
              Benchmark
            </a>
            <button onClick={onStart}
                    className="bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90">
              Open app
            </button>
          </div>
        </nav>
      </header>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-40">
        <div className="pointer-events-none absolute inset-0 grid-etch opacity-60" />
        <div className="pointer-events-none absolute inset-0 ember-glow opacity-30" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

        <div className="relative z-10 w-full max-w-5xl animate-reveal-up text-center">
          <span className="mb-8 block font-mono text-[11px] uppercase tracking-[0.35em] text-primary">
            vetta // assessment triage
          </span>
          <h1 className="mb-8 font-display text-6xl leading-[0.85] font-bold tracking-tighter text-balance italic md:text-8xl">
            Trust what runs,
            <br />
            not what is written.
          </h1>
          <p className="mx-auto mb-12 max-w-xl text-lg text-pretty text-ink-muted">
            vetta reviews your candidates' data science notebooks by actually running the code and
            checking every claim against what execution produces.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button onClick={onStart}
                    className="bg-primary px-8 py-4 text-sm font-medium tracking-widest text-primary-foreground uppercase transition-colors hover:bg-primary/90">
              See the evidence
            </button>
            <a href="#pipeline"
               className="border border-ink-line px-8 py-4 text-sm font-medium tracking-widest uppercase transition-colors hover:bg-white/5">
              How it works
            </a>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-10 z-10 mx-auto flex max-w-6xl flex-wrap justify-between gap-6 border-t border-ink-line px-6 pt-8 font-mono text-[10px] tracking-widest uppercase text-ink-muted">
          <div className="flex gap-2">
            <span>Runtime:</span> <span className="text-primary">papermill sandbox ×2</span>
          </div>
          <div className="flex gap-2">
            <span>Defect recall:</span> <span>0.94</span>
          </div>
          <div className="flex gap-2">
            <span>Replay:</span> <span>100% offline, zero cost</span>
          </div>
          <div className="flex gap-2">
            <span>Engine:</span> <span>GPT-5.2 pinned</span>
          </div>
        </div>
      </section>

      <section className="border-y border-ink-line bg-ink-soft py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="max-w-3xl font-display text-2xl leading-snug tracking-tight text-balance md:text-3xl">
            A notebook can look impressive and still be wrong in ways reading alone never catches.
          </p>
          <div className="mt-12 grid gap-px bg-ink-line md:grid-cols-4">
            {[
              ['AUC 0.93', 'claimed in markdown, reproduced by no cell'],
              ['no seed', 'results change on every single run'],
              ['stale kernel', 'cells only worked out of order'],
              ['leakage', 'test data silently inflating the score'],
            ].map(([t, d]) => (
              <div key={t} className="bg-ink-soft p-6">
                <div className="font-mono text-sm text-primary">{t}</div>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pipeline" className="border-b border-ink-line py-32">
        <div className="mx-auto grid max-w-6xl gap-20 px-6 lg:grid-cols-2">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
              The pipeline
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight italic">
              Four agents, one chain of custody.
            </h2>
            <p className="mt-6 max-w-md text-ink-muted">
              Execution comes first and it involves no model at all. Everything after it is an
              interpretation of facts that were already measured.
            </p>
          </div>
          <div className="space-y-12">
            {STAGES.map((s, i) => (
              <div key={s.n} className="relative pl-12">
                <div className="absolute left-0 top-0 font-mono text-sm text-primary">{s.n}</div>
                {i < STAGES.length - 1 && (
                  <div className="absolute left-[7px] top-7 h-full w-px bg-ink-line" />
                )}
                <div className="flex items-baseline gap-3">
                  <h3 className="font-bold tracking-wide uppercase">{s.name}</h3>
                  <span className="border border-ink-line px-2 py-0.5 font-mono text-[10px] uppercase text-ink-muted">
                    {s.kind}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="benchmark" className="bg-app py-32 text-app-fg">
        <div className="mx-auto max-w-5xl px-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            Measured, not claimed
          </span>
          <h2 className="mt-3 font-display text-5xl font-bold tracking-tighter">
            vetta vs. a deliberately strong baseline
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-app-muted">
            Same model, same rubric, given the fully executed notebook in one prompt. 8 synthetic
            candidates, 12 defects planted by script and pre-registered as ground truth. Reading
            recovers a lot. What it can never recover is the defect that only moves when you run it.
          </p>

          <div className="mt-16 space-y-12">
            {BENCH.map(b => (
              <div key={b.label}>
                <div className="flex items-baseline justify-between border-b border-app-border pb-3">
                  <span className="font-medium">{b.label}</span>
                  <span className="font-mono text-[11px] uppercase text-app-muted">{b.note}</span>
                </div>
                <div className="mt-6 space-y-4">
                  <Bar name="vetta" value={b.vetta} strong />
                  <Bar name="baseline" value={b.base} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 border border-app-border bg-white p-6 font-mono text-xs text-app-muted">
            <span className="text-primary">$</span> vetta replay --offline
            <span className="mt-2 block text-app-fg">
              recorded LLM calls re-derive every number above, at zero cost.
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-line py-24 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-3 font-display text-4xl font-bold italic">
            Stop grading prose. Grade execution.
          </h2>
          <p className="mb-10 text-sm text-ink-muted">
            The shortlist is still yours: nothing is ever decided without a human.
          </p>
          <button onClick={onStart}
                  className="inline-block bg-primary px-10 py-5 text-sm font-bold tracking-widest text-primary-foreground uppercase transition-colors hover:bg-primary/90">
            Open the triage queue
          </button>
          <div className="mt-20 font-mono text-[10px] tracking-[0.4em] uppercase text-white/25">
            built solo in 3 days · micro1 agentic workflows hackathon
          </div>
        </div>
      </footer>
    </div>
  )
}

// ==================================== SYNTAX HIGHLIGHT (python, lightweight)
const PY_KEYWORDS = new Set(('import,from,as,def,return,if,elif,else,for,while,in,not,and,or,is,None,True,False,' +
  'class,try,except,finally,with,lambda,pass,break,continue,raise,assert,yield,global,del').split(','))

function tokenizePy(line) {
  const tokens = []
  const re = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+\.?\d*)\b|([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()|([A-Za-z_][A-Za-z0-9_]*)|(\s+|.)/g
  let m
  while ((m = re.exec(line)) !== null) {
    if (m[1] !== undefined) tokens.push(['comment', m[1]])
    else if (m[2] !== undefined) tokens.push(['string', m[2]])
    else if (m[3] !== undefined) tokens.push(['number', m[3]])
    else if (m[4] !== undefined) tokens.push([PY_KEYWORDS.has(m[4]) ? 'keyword' : 'func', m[4]])
    else if (m[5] !== undefined) tokens.push([PY_KEYWORDS.has(m[5]) ? 'keyword' : 'ident', m[5]])
    else tokens.push(['op', m[6]])
    if (m.index === re.lastIndex) re.lastIndex++
  }
  return tokens
}

const TOKEN_COLOR = {
  comment: 'text-[#6a9955] italic',
  string: 'text-[#ce9178]',
  number: 'text-[#b5cea8]',
  keyword: 'text-[#c586c0]',
  func: 'text-[#dcdcaa]',
  ident: 'text-[#9cdcfe]',
  op: 'text-[#d4d4d4]',
}

function CodeBlock({ source }) {
  const lines = source.split('\n')
  return (
    <div className="overflow-x-auto bg-app-fg py-1 font-mono text-[13px] leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className="flex hover:bg-white/5">
          <span className="w-9 shrink-0 select-none pr-3 text-right text-white/30">{i + 1}</span>
          <pre className="flex-1 whitespace-pre">
            {tokenizePy(line).map(([t, v], j) => (
              <span key={j} className={TOKEN_COLOR[t]}>{v}</span>
            ))}
          </pre>
        </div>
      ))}
    </div>
  )
}

function CellCard({ c, ran = true }) {
  return (
    <div className="mt-3 border border-app-border">
      {c.type === 'markdown' ? (
        <div className="bg-white px-4 py-3">
          <p className="mb-1.5 font-mono text-xs uppercase tracking-widest text-app-muted">md · cell {c.index}</p>
          <pre className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-app-fg/80">{c.source}</pre>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between bg-app-fg px-3 py-1.5">
            <span className="font-mono text-xs uppercase tracking-widest text-white/50">In [{c.index}] · python</span>
            <span className="font-mono text-xs text-primary">executed by vetta</span>
          </div>
          <CodeBlock source={c.source} />
          {c.outputs.length > 0 && (
            <div className="border-t border-white/10 bg-app-fg px-3 py-2">
              <p className="mb-1 font-mono text-xs text-white/40">Out [{c.index}]</p>
              <pre className={`whitespace-pre-wrap font-mono text-[13px] ${c.outputs.join('').includes('ERROR') ? 'text-[#ff7b72]' : 'text-[#8ddb8c]'}`}>
                {c.outputs.join('\n')}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ================================================================ WIZARD
function NewEvaluation({ onDone, onCancel }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [reqs, setReqs] = useState('')
  const [chips, setChips] = useState([])
  const [error, setError] = useState('')
  const [runId, setRunId] = useState(null)
  const [status, setStatus] = useState(null)
  const poll = useRef(null)

  const SKILLS = ['Rigorous methodology', 'Clean, reproducible code', 'Honest reporting',
                  'Careful data cleaning', 'Sound model evaluation', 'Business-minded conclusions']
  const toggleChip = c => setChips(x => x.includes(c) ? x.filter(y => y !== c) : [...x, c])

  const addFiles = list => {
    const nbs = [...list].filter(f => f.name.endsWith('.ipynb'))
    setFiles(cur => {
      const names = new Set(cur.map(f => f.name))
      return [...cur, ...nbs.filter(f => !names.has(f.name))]
    })
  }

  const launch = () => {
    setError('')
    const fd = new FormData()
    fd.append('name', name)
    fd.append('mode', 'live')
    fd.append('requirements', [chips.join(', '), reqs.trim()].filter(Boolean).join('. '))
    files.forEach(f => fd.append('files', f))
    fetch('/api/evaluations/upload', { method: 'POST', body: fd })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).detail || 'error')
        return r.json()
      }).then(d => { setRunId(d.run_id); setStep(4) })
      .catch(e => setError(String(e.message || e)))
  }

  useEffect(() => {
    if (step !== 4 || !runId) return
    poll.current = setInterval(() => {
      fetch(`/api/runs/${runId}/status`).then(r => r.json()).then(s => {
        setStatus(s)
        if (s.state === 'done') { clearInterval(poll.current); onDone(runId) }
      })
    }, 2500)
    return () => clearInterval(poll.current)
  }, [step, runId])

  const stepNames = ['The process', 'Name', 'Profile', 'Notebooks', 'Evaluating']
  const Next = ({ disabled, onClick, children = 'Continue' }) => (
    <button disabled={disabled} onClick={onClick}
            className="bg-primary px-8 py-3 font-mono text-[13px] font-medium uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">
      {children} ›
    </button>
  )
  const BackBtn = ({ to }) => (
    <button onClick={() => setStep(to)}
            className="font-mono text-[13px] uppercase tracking-widest text-app-muted transition-colors hover:text-app-fg">
      ← back
    </button>
  )

  return (
    <div className="app-ui fixed inset-0 z-50 flex flex-col bg-app text-app-fg">
      <header className="flex items-center justify-between border-b border-app-border px-8 py-5">
        <span className="font-display text-lg font-bold tracking-tight">vetta<span className="text-primary">.</span></span>
        <div className="hidden items-center md:flex">
          {stepNames.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`grid size-6 place-items-center font-mono text-xs font-medium
                     ${i < step ? 'bg-primary text-primary-foreground' : i === step ? 'bg-app-fg text-white' : 'border border-app-border text-app-muted'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`font-mono text-xs uppercase tracking-widest ${i === step ? 'text-app-fg' : 'text-app-muted'}`}>{s}</span>
              </div>
              {i < 4 && <div className={`mx-3 h-px w-8 ${i < step ? 'bg-primary' : 'bg-app-border'}`} />}
            </div>
          ))}
        </div>
        <button onClick={onCancel}
                className="font-mono text-[13px] uppercase tracking-widest text-app-muted hover:text-app-fg">
          exit
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center overflow-hidden px-8">
        {step === 0 && (
          <div key="s0" className="slide-in max-w-3xl text-center">
            <span className="font-mono text-[13px] uppercase tracking-[0.3em] text-primary">how it works</span>
            <h2 className="mt-4 mb-10 font-display text-4xl font-bold tracking-tight italic">
              You point at the notebooks.<br />vetta executes, verifies and organizes the evidence.
            </h2>
            <div className="mb-12 grid gap-px border border-app-border bg-app-border text-left md:grid-cols-3">
              {[
                ['01 / Execute', 'Every notebook runs twice in a sandbox: real metrics, broken cells, seed sensitivity.'],
                ['02 / Verify', 'The agent checks what the candidate wrote against what the code produces, cell by cell.'],
                ['03 / Decide', 'You get the ranked queue and record the final call. Nothing advances without you.'],
              ].map(([t, d]) => (
                <div key={t} className="bg-white p-5">
                  <p className="font-mono text-xs uppercase tracking-widest text-primary">{t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-app-muted">{d}</p>
                </div>
              ))}
            </div>
            <Next onClick={() => setStep(1)} />
          </div>
        )}

        {step === 1 && (
          <div key="s1" className="slide-in w-full max-w-xl text-center">
            <span className="font-mono text-[13px] uppercase tracking-[0.3em] text-primary">step 1 of 3</span>
            <h2 className="mt-4 mb-3 font-display text-4xl font-bold tracking-tight">What is this evaluation called?</h2>
            <p className="mb-10 text-[15px] text-app-muted">Usually the role name. E.g. "Senior Data Scientist, August".</p>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
                   placeholder="evaluation name"
                   className="mb-10 w-full border border-app-border bg-white px-5 py-4 text-center text-lg outline-none focus:border-primary" />
            <div className="flex items-center justify-center gap-8">
              <BackBtn to={0} />
              <Next disabled={!name.trim()} onClick={() => setStep(2)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="s2" className="slide-in w-full max-w-2xl text-center">
            <span className="font-mono text-[13px] uppercase tracking-[0.3em] text-primary">step 2 of 3</span>
            <h2 className="mt-4 mb-3 font-display text-4xl font-bold tracking-tight">What are you looking for?</h2>
            <p className="mb-8 text-[15px] text-app-muted">
              Pick the qualities this role demands and describe what the candidate should be great at.
              vetta weighs these when scoring and summarizing.
            </p>
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {SKILLS.map(c => (
                <button key={c} onClick={() => toggleChip(c)}
                        className={`px-4 py-2 font-mono text-[13px] uppercase tracking-widest transition-colors
                             ${chips.includes(c) ? 'bg-app-fg text-white' : 'border border-app-border bg-white text-app-muted hover:text-app-fg'}`}>
                  {c}
                </button>
              ))}
            </div>
            <textarea value={reqs} onChange={e => setReqs(e.target.value)} rows={3}
                      placeholder="e.g. must handle messy real-world data well, explain trade-offs clearly, and know churn problems"
                      className="mb-8 w-full resize-none border border-app-border bg-white px-5 py-4 text-[15px] outline-none focus:border-primary" />
            <div className="flex items-center justify-center gap-8">
              <BackBtn to={1} />
              <Next onClick={() => setStep(3)}>{chips.length || reqs.trim() ? 'Continue' : 'Skip for now'}</Next>
            </div>
          </div>
        )}

        {step === 3 && (
          <div key="s3" className="slide-in w-full max-w-xl text-center">
            <span className="font-mono text-[13px] uppercase tracking-[0.3em] text-primary">step 3 of 3</span>
            <h2 className="mt-4 mb-3 font-display text-4xl font-bold tracking-tight">Drop the notebooks</h2>
            <p className="mb-8 text-[15px] text-app-muted">
              Drag the candidates' .ipynb files here, exactly as delivered. Each file is one candidate.
            </p>

            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
              className={`block cursor-pointer border-2 border-dashed px-6 py-12 transition-colors
                   ${dragOver ? 'border-primary bg-primary/5' : 'border-app-border bg-white hover:border-primary/50'}`}>
              <input type="file" multiple accept=".ipynb" className="hidden"
                     onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
              <p className="font-mono text-[13px] uppercase tracking-widest text-app-muted">
                {dragOver ? 'release to add' : 'drag .ipynb files here, or click to browse'}
              </p>
            </label>

            {files.length > 0 && (
              <div className="mt-4 border border-app-border bg-white text-left">
                {files.map(f => (
                  <div key={f.name} className="flex items-center justify-between border-b border-app-border px-4 py-2 last:border-b-0">
                    <span className="font-mono text-[13px]">{f.name}</span>
                    <span className="font-mono text-xs text-app-muted">
                      {(f.size / 1024).toFixed(0)} KB
                      <button onClick={() => setFiles(cur => cur.filter(x => x.name !== f.name))}
                              className="ml-3 text-fail hover:opacity-70">✕</button>
                    </span>
                  </div>
                ))}
                <p className="px-4 py-2 font-mono text-xs uppercase tracking-widest text-app-muted">
                  {files.length} candidate{files.length > 1 ? 's' : ''} ready
                </p>
              </div>
            )}

            {error && <p className="mt-3 text-[15px] text-fail">{error}</p>}
            <p className="mt-6 mb-8 font-mono text-xs uppercase tracking-widest text-app-muted">
              sandboxed execution · the final decision is always human
            </p>
            <div className="flex items-center justify-center gap-8">
              <BackBtn to={2} />
              <Next disabled={files.length === 0} onClick={launch}>Start evaluation</Next>
            </div>
          </div>
        )}

        {step === 4 && (
          <div key="s4" className="slide-in w-full max-w-xl text-center">
            {status?.state === 'error' ? (
              <>
                <p className="mb-4 font-display text-2xl font-bold text-fail">The evaluation failed</p>
                <pre className="mb-6 max-h-48 overflow-auto border border-app-border bg-white p-4 text-left font-mono text-sm text-fail">{status.error}</pre>
                <button onClick={() => setStep(3)}
                        className="font-mono text-[13px] uppercase tracking-widest text-app-muted underline hover:text-app-fg">
                  ← try again
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-8 size-10 animate-spin border-2 border-app-border border-t-primary" />
                <h2 className="mb-3 font-display text-4xl font-bold tracking-tight">Evaluating candidates…</h2>
                <p className="mb-2 text-[15px] text-app-muted">
                  {status ? `${status.completed ?? 0} of ${status.total} notebooks` : 'starting'}
                </p>
                <p className="mb-10 font-mono text-xs uppercase tracking-widest text-app-muted">
                  execute → verify → score · ~20-30s per notebook
                </p>
                <div className="mx-auto h-1 w-full max-w-sm bg-app-border">
                  <div className="h-full bg-primary transition-all duration-700"
                       style={{ width: `${status?.total ? (status.completed / status.total) * 100 : 4}%` }} />
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ================================================================== QUEUE
function Queue({ run, onOpen }) {
  const [cands, setCands] = useState(null)
  const [reqs, setReqs] = useState('')
  const [filter, setFilter] = useState('ALL')
  useEffect(() => {
    setCands(null); setFilter('ALL')
    fetch(`/api/runs/${run}/candidates`).then(r => r.json()).then(setCands)
    fetch(`/api/runs/${run}/status`).then(r => r.json())
      .then(s => setReqs(s.requirements || '')).catch(() => setReqs(''))
  }, [run])
  if (!cands) return <p className="p-8 font-mono text-sm text-app-muted">loading…</p>

  const finalDecision = c => c.human_decision?.decision || c.decision
  const shortlist = cands.filter(c => finalDecision(c) === 'AVANCAR')
  const decided = cands.filter(c => c.human_decision).length
  const visible = cands.filter(c => filter === 'ALL' || c.decision === filter)
  const counts = k => cands.filter(c => c.decision === k).length

  const exportShortlist = () => {
    const lines = [`# Shortlist: ${run}`, '',
      `${shortlist.length} of ${cands.length} candidates advancing. Decisions: ${decided} human, ${cands.length - decided} agent-recommended.`, '']
    cands.slice().sort((a, b) => b.weighted_score - a.weighted_score).forEach(c => {
      lines.push(`## ${prettyName(c.id)} (${finalDecision(c)}${c.human_decision ? ', your call' : ', recommended'})`)
      lines.push(`Score ${c.weighted_score}/5. ${c.summary}`)
      if (c.human_decision?.note) lines.push(`Note: ${c.human_decision.note}`)
      lines.push('')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `shortlist-${run}.md`
    a.click()
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{prettyName(run)}</h1>
          <p className="mt-1 text-[15px] text-app-muted">
            {cands.length} candidates, every notebook executed and verified.{' '}
            <span className="font-medium text-app-fg">{shortlist.length} advancing</span>
            {' '}· {decided}/{cands.length} decided by you. The final call is always yours.
          </p>
        </div>
        <button onClick={exportShortlist}
                className="bg-app-fg px-4 py-2 font-mono text-[13px] uppercase tracking-widest text-white transition-colors hover:bg-app-fg/90">
          ⤓ Export shortlist
        </button>
      </div>

      {reqs && (
        <div className="mt-6 border border-app-border bg-white p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">what this role is looking for</p>
          <p className="mt-2 text-[15px] text-app-fg/80">{reqs}</p>
        </div>
      )}

      <div className="mt-8 grid gap-px border border-app-border bg-app-border md:grid-cols-4">
        {Object.entries(CRITERIA).map(([k, [nome, desc]]) => (
          <div key={k} className="bg-white p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">{nome}</p>
            <p className="mt-2 text-sm leading-relaxed text-app-muted">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {[['ALL', `all (${cands.length})`],
          ['AVANCAR', `advance (${counts('AVANCAR')})`],
          ['REVISAR', `review (${counts('REVISAR')})`],
          ['REPROVAR', `reject (${counts('REPROVAR')})`],
          ...(counts('QUARANTINE') ? [['QUARANTINE', `quarantined (${counts('QUARANTINE')})`]] : [])].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
                  className={`px-4 py-2 font-mono text-[13px] uppercase tracking-widest transition-colors
                       ${filter === k ? 'bg-app-fg text-white' : 'border border-app-border bg-white text-app-muted hover:text-app-fg'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {[...visible].sort((a, b) => b.weighted_score - a.weighted_score).map((c, rank) => (
          <article key={c.id}
                   className="border border-app-border bg-white p-6 transition-colors hover:border-primary/40">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid size-10 place-items-center bg-app font-mono text-sm text-app-muted">
                  #{rank + 1}
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold">{prettyName(c.id)}</h2>
                  <span className="font-mono text-[13px] text-app-muted">{c.id}.ipynb</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {c.human_decision && (
                  <span className="font-mono text-xs uppercase tracking-widest text-app-muted">
                    your call: <span className="text-app-fg">{DECISION_LABEL[c.human_decision.decision]}</span>
                  </span>
                )}
                <div className="text-right">
                  <div className="font-mono text-xs uppercase text-app-muted">score</div>
                  <div className="font-display text-xl font-bold leading-none text-primary">
                    {c.weighted_score.toFixed(1)}<span className="text-[15px] text-app-muted">/5</span>
                  </div>
                </div>
                <Badge decision={c.decision} />
              </div>
            </div>

            <p className="mt-5 text-[15px] leading-relaxed text-app-fg/80">{c.summary}</p>

            {c.findings?.length > 0 && (
              <div className="mt-5 space-y-2">
                {c.findings.map((f, i) => (
                  <div key={i}
                       className={`border-l-2 bg-app px-4 py-3 ${f.severity === 'critical' ? 'border-fail' : 'border-warn'}`}>
                    <span className="text-sm font-semibold">{DEFECT_SHORT[f.type] || f.type}</span>
                    <p className="mt-1 font-mono text-[13px] leading-relaxed text-app-muted">{DEFECT_LABEL[f.type]}</p>
                  </div>
                ))}
              </div>
            )}
            {c.n_findings === 0 && (
              <p className="mt-5 font-mono text-[13px] text-pass">
                ✓ ran everything, checked every number in the text, no issues found
              </p>
            )}

            <div className="mt-6 grid gap-6 border-t border-app-border pt-5 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {Object.entries(c.scores).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="w-24 font-mono text-xs uppercase text-app-muted">{CRITERIA[k]?.[0] || k}</span>
                    <div className="h-1 flex-1 bg-app-border">
                      <div className={`h-full ${v <= 2 ? 'bg-fail' : v <= 3 ? 'bg-warn' : 'bg-pass'}`}
                           style={{ width: `${(v / 5) * 100}%` }} />
                    </div>
                    <span className="font-mono text-[13px]">{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => onOpen(c.id)}
                      className="justify-self-start border border-app-border px-4 py-2 font-mono text-[13px] uppercase tracking-widest transition-colors hover:border-primary hover:text-primary md:justify-self-end">
                open evidence ›
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ============================================== DETAIL (evidence thread)
function VettaBubble({ children, delay = 0 }) {
  return (
    <div className="slide-in flex gap-3" style={{ animationDelay: `${delay}ms` }}>
      <div className="grid size-7 shrink-0 place-items-center bg-primary font-display text-sm font-bold text-primary-foreground">v</div>
      <div className="min-w-0 flex-1 border border-app-border bg-white p-4 text-[15px] leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function Detail({ run, id, onBack }) {
  const [v, setV] = useState(null)
  const [note, setNote] = useState('')
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [showTraj, setShowTraj] = useState(false)
  const bottom = useRef(null)

  useEffect(() => {
    setV(null); setMsgs([]); setShowAll(false); setShowTraj(false)
    fetch(`/api/runs/${run}/candidates/${id}`).then(r => r.json()).then(setV)
  }, [run, id])
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy, showAll])

  if (!v) return <p className="p-8 font-mono text-sm text-app-muted">loading…</p>

  const decide = d =>
    fetch(`/api/runs/${run}/candidates/${id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: d, note }),
    }).then(() => fetch(`/api/runs/${run}/candidates/${id}`).then(r => r.json()).then(setV))

  const send = (text) => {
    const t = (text ?? input).trim()
    if (!t || busy) return
    const next = [...msgs, { role: 'user', content: t }]
    setMsgs(next); setInput(''); setBusy(true)
    fetch(`/api/runs/${run}/candidates/${id}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next }),
    }).then(r => r.json())
      .then(d => setMsgs(m => [...m, { role: 'assistant', content: d.reply || 'sorry, something went wrong' }]))
      .catch(() => setMsgs(m => [...m, { role: 'assistant', content: 'connection error, try again' }]))
      .finally(() => setBusy(false))
  }

  const cellsWithFindings = v.cells.filter(c => c.findings.length > 0)

  return (
    <div className="flex h-screen flex-col py-0">
      <div className="flex flex-wrap items-center gap-4 border-b border-app-border bg-white px-6 py-4">
        <button onClick={onBack}
                className="font-mono text-[13px] uppercase tracking-widest text-app-muted transition-colors hover:text-primary">
          ← queue
        </button>
        <h2 className="font-display text-lg font-bold">{prettyName(v.notebook)}</h2>
        <span className="font-mono text-[13px] text-app-muted">{v.notebook}</span>
        <Badge decision={v.decision} />
        <div className="hidden items-center gap-4 xl:flex">
          {Object.entries(v.scores).map(([k, s]) => (
            <span key={k} className="font-mono text-xs uppercase text-app-muted" title={CRITERIA[k]?.[1]}>
              {CRITERIA[k]?.[0]} <b className={s <= 2 ? 'text-fail' : s <= 3 ? 'text-warn' : 'text-pass'}>{s}</b>
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-app-muted">
            {v.human_decision ? `recorded: ${DECISION_LABEL[v.human_decision.decision]}` : 'your decision:'}
          </span>
          {['AVANCAR', 'REVISAR', 'REPROVAR'].map(d => (
            <button key={d} onClick={() => decide(d)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-80 ${VERDICT_STYLE[d]}`}>
              {DECISION_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-5">
          {v.decision === 'QUARANTINE' && (
            <div className="border-l-4 border-fail bg-fail-soft px-5 py-4">
              <p className="font-mono text-sm font-bold uppercase tracking-widest text-fail">⚠ Quarantined before execution</p>
              <p className="mt-2 text-[15px] text-app-fg/80">
                vetta's safety gate flagged code this notebook has no business running. It was
                <b> never executed</b> and <b>never sent to the model</b>. Inspect the flagged cells
                below and decide manually.
              </p>
            </div>
          )}
          <VettaBubble delay={0}>
            <p className="text-app-fg/80">{v.summary}</p>
          </VettaBubble>

          {cellsWithFindings.map((c, i) => (
            <VettaBubble key={c.index} delay={150 * (i + 1)}>
              {c.findings.map((f, j) => (
                <div key={j} className={j > 0 ? 'mt-4' : ''}>
                  <p className={`font-mono text-xs font-bold uppercase tracking-widest ${f.severity === 'critical' ? 'text-fail' : 'text-warn'}`}>
                    ⚑ {DEFECT_SHORT[f.type] || f.type} · {f.severity} · cell {c.index}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-app-muted">
                    <b className="text-app-fg">They claim:</b> {f.claim}
                  </p>
                  <p className="text-sm leading-relaxed text-app-muted">
                    <b className="text-app-fg">Execution shows:</b> {f.evidence}
                  </p>
                </div>
              ))}
              <CellCard c={c} ran={v.decision !== 'QUARANTINE'} />
            </VettaBubble>
          ))}

          {v.findings.length === 0 && (
            <VettaBubble delay={150}>
              <p className="font-mono text-[13px] text-pass">
                ✓ I ran everything twice and checked every number in the text. No issues found.
              </p>
            </VettaBubble>
          )}

          <VettaBubble delay={150 * (cellsWithFindings.length + 1)}>
            <p className="text-app-fg/80">
              Want to see the whole notebook, or ask me anything about this evaluation?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setShowAll(s => !s)}
                      className="border border-app-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors hover:border-primary hover:text-primary">
                {showAll ? 'hide full notebook' : 'show full notebook'}
              </button>
              <button onClick={() => setShowTraj(s => !s)}
                      className="border border-app-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors hover:border-primary hover:text-primary">
                {showTraj ? 'hide agent trajectory' : 'what the agent did'}
              </button>
              {['Why this recommendation?', 'What should I probe in the interview?'].map(s => (
                <button key={s} onClick={() => send(s)}
                        className="border border-app-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                  {s}
                </button>
              ))}
            </div>
          </VettaBubble>

          {showAll && (
            <VettaBubble>
              <p className="font-mono text-xs uppercase tracking-widest text-app-muted">
                full notebook, exactly as delivered
              </p>
              {v.cells.map(c => <CellCard key={c.index} c={c} ran={v.decision !== 'QUARANTINE'} />)}
            </VettaBubble>
          )}

          {showTraj && (
            <VettaBubble>
              <p className="font-mono text-xs uppercase tracking-widest text-app-muted">
                what the agents did, step by step
              </p>
              {v.trajectory.map((step, i) => (
                <div key={i} className="mt-3 border border-app-border">
                  <p className="border-b border-app-border bg-app px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-primary">
                    {i + 1} · {step.agent}
                  </p>
                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap bg-white p-3 font-mono text-xs leading-relaxed text-app-muted">
                    {JSON.stringify({ ...step, input_facts: undefined }, null, 2)}
                  </pre>
                </div>
              ))}
            </VettaBubble>
          )}

          {msgs.map((m, i) => (
            m.role === 'user' ? (
              <div key={i} className="slide-in flex justify-end">
                <div className="max-w-[80%] whitespace-pre-wrap bg-app-fg p-4 text-[15px] leading-relaxed text-white">
                  {m.content}
                </div>
              </div>
            ) : (
              <VettaBubble key={i}>
                <p className="whitespace-pre-wrap text-app-fg/80">{m.content}</p>
              </VettaBubble>
            )
          ))}
          {busy && (
            <VettaBubble>
              <p className="animate-pulse font-mono text-[13px] text-app-muted">analyzing the evidence…</p>
            </VettaBubble>
          )}
          <div ref={bottom} />
        </div>
      </div>

      <div className="border-t border-app-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && send()}
                 placeholder={`ask about ${prettyName(v.notebook)}…`}
                 className="flex-1 border border-app-border bg-app px-4 py-3 text-[15px] outline-none focus:border-primary" />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="decision note"
                 className="w-36 border border-app-border bg-app px-3 py-3 font-mono text-[13px] outline-none focus:border-primary" />
          <button onClick={() => send()} disabled={busy}
                  className="bg-primary px-5 py-3 font-mono text-[15px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================ COMPARISON
function Comparison({ run }) {
  const [ev, setEv] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    setEv(null); setErr(false)
    fetch(`/api/runs/${run}/comparison`)
      .then(r => { if (!r.ok) throw 0; return r.json() })
      .then(setEv).catch(() => setErr(true))
  }, [run])
  if (err) return (
    <p className="p-8 font-mono text-sm text-app-muted">
      This evaluation has no baseline comparison (available on the study's official runs: official_a/b/c).
    </p>
  )
  if (!ev?.agent) return <p className="p-8 font-mono text-sm text-app-muted">loading…</p>
  const rows = [
    ['Precision (defects)', ev.baseline?.defects.precision, ev.agent.defects.precision],
    ['Recall (defects)', ev.baseline?.defects.recall, ev.agent.defects.recall],
    ['F1', ev.baseline?.defects.f1, ev.agent.defects.f1],
    ['Recall, static defects (S)', ev.baseline?.by_class.S_static.recall, ev.agent.by_class.S_static.recall],
    ['Recall, execution-only defects (E)', ev.baseline?.by_class.E_executable.recall, ev.agent.by_class.E_executable.recall],
    ['Decision accuracy', ev.baseline?.decision_accuracy, ev.agent.decision_accuracy],
  ]
  return (
    <div>
      <span className="font-mono text-[13px] uppercase tracking-[0.3em] text-primary">Measured, not claimed</span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Baseline vs. vetta</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-app-muted">
        Same {ev.agent.notebooks} notebooks, same model, same rubric. The baseline reads the
        already-executed notebook in a single prompt; vetta re-executes and verifies. The gap
        concentrates on execution-only (E) defects, invisible without running the code.
      </p>

      <div className="mt-8 border border-app-border bg-white">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-app-border">
              <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-app-muted">metric</th>
              <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-app-muted">baseline</th>
              <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-app-muted">vetta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, b, a]) => (
              <tr key={label} className="border-t border-app-border">
                <td className="px-4 py-3 text-app-fg/80">{label}</td>
                <td className="px-4 py-3 text-right font-mono text-app-muted">{b ?? '-'}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${a > (b ?? 0) ? 'text-pass' : a < b ? 'text-fail' : 'text-app-fg'}`}>{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-px border border-app-border bg-app-border md:grid-cols-2">
        {ev.agent.rows.map(r => (
          <div key={r.notebook} className="bg-white p-4">
            <p className="font-display text-[15px] font-bold">{prettyName(r.notebook)}</p>
            <p className="mt-1 font-mono text-[13px] text-app-muted">
              expected {r.expected} · vetta {r.got} {r.decision_ok ? '✓' : '✗'}
            </p>
            {r.missed.length > 0 && <p className="mt-1 font-mono text-[13px] text-fail">missed: {r.missed.join(', ')}</p>}
            {r.false_positives.length > 0 && <p className="mt-1 font-mono text-[13px] text-warn">false alarm: {r.false_positives.join(', ')}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================================================================== APP
export default function App() {
  const [view, setView] = useState({ name: 'landing' })
  const [runs, setRuns] = useState(null)
  const run = view.run

  const loadRuns = () =>
    fetch('/api/runs').then(r => r.json()).then(setRuns).catch(() => setRuns([]))
  useEffect(() => { if (view.name !== 'landing') loadRuns() }, [view.name === 'landing'])

  if (view.name === 'landing')
    return <Landing onStart={() => setView({ name: 'app' })} />

  if (view.name === 'new')
    return <NewEvaluation onDone={r => { loadRuns(); setView({ name: 'queue', run: r }) }}
                          onCancel={() => setView(view.prev || { name: 'app' })} />

  const isDetail = view.name === 'detail'

  return (
    <div className="app-ui min-h-screen bg-app text-app-fg">
      <div className={`mx-auto flex max-w-7xl gap-8 px-6 ${isDetail ? 'py-0' : 'py-10'}`}>
        <aside className={`hidden w-60 shrink-0 lg:block ${isDetail ? 'py-10' : ''}`}>
          <button onClick={() => setView({ name: 'landing' })}
                  className="font-display text-lg font-bold tracking-tight">
            vetta<span className="text-primary">.</span>
          </button>
          <p className="mt-10 font-mono text-xs uppercase tracking-widest text-app-muted">Evaluations</p>
          <nav className="mt-4 space-y-1">
            {runs === null && <p className="px-3 font-mono text-xs text-app-muted">loading…</p>}
            {runs?.length === 0 && <p className="px-3 font-mono text-xs text-app-muted">nothing here yet</p>}
            {runs?.filter(r => !/^(dev|smoke|vaga-teste)/.test(r.run_id)).map(r => (
              <button key={r.run_id} onClick={() => setView({ name: 'queue', run: r.run_id })}
                      className={`block w-full px-3 py-2 text-left text-[15px] transition-colors
                           ${run === r.run_id ? 'border border-app-border bg-white font-medium' : 'text-app-muted hover:text-app-fg'}`}>
                {prettyName(r.run_id)}
                <span className="block font-mono text-xs text-app-muted">
                  {r.candidates} candidates{r.has_evaluation ? ' · benchmarked' : ''}
                </span>
              </button>
            ))}
          </nav>
          <button onClick={() => setView({ ...view, name: 'new', prev: view })}
                  className="mt-8 w-full bg-primary px-4 py-3 font-mono text-[13px] uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90">
            + New evaluation
          </button>
          <p className="mt-4 font-mono text-xs text-app-muted">the final decision is always human</p>

          {run && (
            <div className="mt-10">
              <p className="font-mono text-xs uppercase tracking-widest text-app-muted">Views</p>
              <nav className="mt-3 space-y-1">
                <button onClick={() => setView({ name: 'queue', run })}
                        className={`block w-full px-3 py-2 text-left text-[15px] transition-colors ${['queue', 'detail'].includes(view.name) ? 'border border-app-border bg-white font-medium' : 'text-app-muted hover:text-app-fg'}`}>
                  Candidates
                </button>
                <button onClick={() => setView({ name: 'comparison', run })}
                        className={`block w-full px-3 py-2 text-left text-[15px] transition-colors ${view.name === 'comparison' ? 'border border-app-border bg-white font-medium' : 'text-app-muted hover:text-app-fg'}`}>
                  Baseline vs. vetta
                </button>
              </nav>
            </div>
          )}
        </aside>

        <main className="min-w-0 flex-1">
          {view.name === 'app' && (
            <div className="flex h-[70vh] items-center justify-center">
              <div className="max-w-sm text-center">
                <p className="font-mono text-[13px] uppercase tracking-[0.3em] text-primary">triage queue</p>
                <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">Pick an evaluation on the left</h2>
                <p className="mt-2 text-[15px] text-app-muted">
                  or create a new one: name it, define the role profile, point at the folder of notebooks.
                </p>
                <button onClick={() => setView({ name: 'new', prev: view })}
                        className="mt-6 bg-primary px-6 py-3 font-mono text-[13px] uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90">
                  + New evaluation
                </button>
              </div>
            </div>
          )}
          {view.name === 'queue' && <Queue run={run} onOpen={id => setView({ name: 'detail', run, id })} />}
          {view.name === 'detail' && <Detail run={run} id={view.id} onBack={() => setView({ name: 'queue', run })} />}
          {view.name === 'comparison' && <Comparison run={run} />}
        </main>
      </div>
    </div>
  )
}
