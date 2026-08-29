import { useEffect, useState } from 'react'

const RUN = 'dev3' // run exibida; trocaremos para a run oficial

const DECISION_STYLE = {
  AVANCAR: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  REVISAR: 'bg-amber-100 text-amber-800 border-amber-300',
  REPROVAR: 'bg-rose-100 text-rose-800 border-rose-300',
}
const DECISION_LABEL = { AVANCAR: '✓ Avançar', REVISAR: '⚠ Revisar', REPROVAR: '✕ Reprovar' }
const DEFECT_LABEL = {
  S1: 'data leakage (fit antes do split)', S2: 'feature derivada do target',
  S3: 'métrica enganosa na narrativa', S4: 'perda silenciosa de dados',
  E1: 'métrica declarada ≠ real', E2: 'célula quebra ao executar',
  E3: 'resultado depende de seed', E4: 'conclusão sem célula que a sustente',
}

function Badge({ decision }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${DECISION_STYLE[decision] || ''}`}>
      {DECISION_LABEL[decision] || decision}
    </span>
  )
}

function ScoreBar({ label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-slate-500">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded">
        <div className={`h-1.5 rounded ${value <= 2 ? 'bg-rose-400' : value <= 3 ? 'bg-amber-400' : 'bg-emerald-400'}`}
             style={{ width: `${value * 20}%` }} />
      </div>
      <span className="w-4 text-slate-600 font-medium">{value}</span>
    </div>
  )
}

// ------------------------------------------------------------- Tela 1: Fila
function Queue({ onOpen }) {
  const [cands, setCands] = useState(null)
  useEffect(() => {
    fetch(`/api/runs/${RUN}/candidates`).then(r => r.json()).then(setCands)
  }, [])
  if (!cands) return <p className="text-slate-400 p-8">carregando…</p>
  const top = cands.filter(c => c.decision === 'AVANCAR')
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800">Fila de avaliação — {cands.length} candidatos</h2>
        <p className="text-sm text-slate-500">
          {top.length} recomendados para avançar · decisão final é sua: revise a evidência e registre.
        </p>
      </div>
      <div className="grid gap-3">
        {[...cands].sort((a, b) => b.weighted_score - a.weighted_score).map(c => (
          <button key={c.id} onClick={() => onOpen(c.id)}
                  className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition flex items-center gap-4">
            <div className="w-40 shrink-0">
              <p className="font-medium text-slate-800">{c.id.replace(/^nb\d+_/, '')}</p>
              <p className="text-xs text-slate-400">{c.id}</p>
            </div>
            <div className="w-56 shrink-0 space-y-1">
              {Object.entries(c.scores).map(([k, v]) => <ScoreBar key={k} label={k} value={v} />)}
            </div>
            <div className="flex-1 flex flex-wrap gap-1.5">
              {c.critical_findings.map((t, i) => (
                <span key={i} className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">
                  {t}: {DEFECT_LABEL[t]}
                </span>
              ))}
              {c.n_findings === 0 && <span className="text-xs text-emerald-600">nenhum defeito encontrado</span>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <Badge decision={c.decision} />
              {c.human_decision && (
                <span className="text-[11px] text-indigo-600">humano: {c.human_decision.decision}</span>
              )}
              <span className="text-xs text-slate-400">score {c.weighted_score.toFixed(1)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// --------------------------------------------------- Tela 2: Detalhe + decisão
function Detail({ id, onBack }) {
  const [v, setV] = useState(null)
  const [tab, setTab] = useState('notebook')
  const [note, setNote] = useState('')
  useEffect(() => {
    fetch(`/api/runs/${RUN}/candidates/${id}`).then(r => r.json()).then(setV)
  }, [id])
  if (!v) return <p className="text-slate-400 p-8">carregando…</p>

  const decide = d =>
    fetch(`/api/runs/${RUN}/candidates/${id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: d, note }),
    }).then(() => fetch(`/api/runs/${RUN}/candidates/${id}`).then(r => r.json()).then(setV))

  return (
    <div className="max-w-5xl mx-auto p-6">
      <button onClick={onBack} className="text-sm text-indigo-600 mb-4">← voltar à fila</button>
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-800">{v.notebook}</h2>
          <Badge decision={v.decision} />
        </div>
        <p className="text-sm text-slate-600 mb-3">{v.summary}</p>
        <div className="grid grid-cols-4 gap-4 max-w-md">
          {Object.entries(v.scores).map(([k, s]) => <ScoreBar key={k} label={k} value={s} />)}
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
        <p className="text-sm font-medium text-indigo-900 mb-2">
          Sua decisão {v.human_decision && <span className="font-normal">— registrada: <b>{v.human_decision.decision}</b> {v.human_decision.note && `("${v.human_decision.note}")`}</span>}
        </p>
        <div className="flex gap-2 items-center">
          {['AVANCAR', 'REVISAR', 'REPROVAR'].map(d => (
            <button key={d} onClick={() => decide(d)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${DECISION_STYLE[d]} hover:opacity-80`}>
              {DECISION_LABEL[d]}
            </button>
          ))}
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="nota (opcional)"
                 className="flex-1 text-xs border border-indigo-200 rounded-lg px-2 py-1.5 bg-white" />
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {['notebook', 'trajetoria'].map(t => (
          <button key={t} onClick={() => setTab(t)}
                  className={`text-sm px-3 py-1.5 rounded-lg ${tab === t ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {t === 'notebook' ? 'Notebook com evidência' : 'O que o agente fez'}
          </button>
        ))}
      </div>

      {tab === 'notebook' && (
        <div className="space-y-2">
          {v.cells.map(c => (
            <div key={c.index}
                 className={`rounded-lg border ${c.findings.length ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'} bg-white overflow-hidden`}>
              {c.findings.map((f, i) => (
                <div key={i} className="bg-rose-50 border-b border-rose-200 px-4 py-2">
                  <p className="text-xs font-semibold text-rose-800">
                    {f.type} · {DEFECT_LABEL[f.type]} · {f.severity}
                  </p>
                  <p className="text-xs text-rose-700 mt-0.5"><b>Alegação:</b> {f.claim}</p>
                  <p className="text-xs text-rose-700"><b>Evidência executada:</b> {f.evidence}</p>
                </div>
              ))}
              <div className="px-4 py-2">
                <p className="text-[10px] text-slate-400 mb-1">célula {c.index} · {c.type}</p>
                <pre className={`text-xs whitespace-pre-wrap ${c.type === 'markdown' ? 'font-sans text-slate-700' : 'font-mono text-slate-800'}`}>
                  {c.source}
                </pre>
                {c.outputs.length > 0 && (
                  <pre className="text-xs font-mono bg-slate-50 border-t border-slate-100 mt-2 p-2 text-slate-600 whitespace-pre-wrap">
                    {c.outputs.join('\n')}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'trajetoria' && (
        <div className="space-y-2">
          {v.trajectory.map((step, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-700 mb-1">
                {i + 1}. {step.agent}
              </p>
              <pre className="text-xs font-mono text-slate-500 whitespace-pre-wrap max-h-64 overflow-auto">
                {JSON.stringify({ ...step, input_facts: undefined }, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------- Tela 3: Baseline vs Agente
function Comparison() {
  const [ev, setEv] = useState(null)
  useEffect(() => {
    fetch(`/api/runs/${RUN}/comparison`).then(r => r.json()).then(setEv)
  }, [])
  if (!ev?.agent) return <p className="text-slate-400 p-8">rode evaluate.py nesta run…</p>
  const rows = [
    ['Precision (defeitos)', ev.baseline?.defects.precision, ev.agent.defects.precision],
    ['Recall (defeitos)', ev.baseline?.defects.recall, ev.agent.defects.recall],
    ['F1', ev.baseline?.defects.f1, ev.agent.defects.f1],
    ['Recall — defeitos estáticos (S)', ev.baseline?.by_class.S_static.recall, ev.agent.by_class.S_static.recall],
    ['Recall — defeitos executáveis (E)', ev.baseline?.by_class.E_executable.recall, ev.agent.by_class.E_executable.recall],
    ['Acurácia de decisão', ev.baseline?.decision_accuracy, ev.agent.decision_accuracy],
  ]
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Baseline vs. Vetta</h2>
      <p className="text-sm text-slate-500 mb-5">
        Mesmos {ev.agent.notebooks} notebooks, mesmo modelo, mesma rubrica. A baseline lê o notebook
        já executado num prompt único; o Vetta re-executa e verifica. A diferença concentra-se nos
        defeitos executáveis (E) — invisíveis sem rodar o código.
      </p>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">métrica</th>
              <th className="text-right px-4 py-2 font-medium">baseline</th>
              <th className="text-right px-4 py-2 font-medium">Vetta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, b, a]) => (
              <tr key={label} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-700">{label}</td>
                <td className="px-4 py-2 text-right text-slate-500">{b ?? '—'}</td>
                <td className={`px-4 py-2 text-right font-semibold ${a > (b ?? 0) ? 'text-emerald-600' : a < b ? 'text-rose-600' : 'text-slate-700'}`}>{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid md:grid-cols-2 gap-3">
        {ev.agent.rows.map(r => (
          <div key={r.notebook} className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
            <p className="font-medium text-slate-700 mb-1">{r.notebook}</p>
            <p className="text-slate-500">esperado {r.expected} · agente {r.got} {r.decision_ok ? '✓' : '✗'}</p>
            {r.missed.length > 0 && <p className="text-rose-600">não detectou: {r.missed.join(', ')}</p>}
            {r.false_positives.length > 0 && <p className="text-amber-600">alarme falso: {r.false_positives.join(', ')}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------- App
export default function App() {
  const [view, setView] = useState({ name: 'queue' })
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
          <h1 className="font-bold text-slate-900 tracking-tight">
            vetta<span className="text-indigo-500">.</span>
          </h1>
          <nav className="flex gap-1 text-sm">
            <button onClick={() => setView({ name: 'queue' })}
                    className={`px-3 py-1.5 rounded-lg ${view.name !== 'comparison' ? 'bg-slate-100 text-slate-800' : 'text-slate-500'}`}>
              Candidatos
            </button>
            <button onClick={() => setView({ name: 'comparison' })}
                    className={`px-3 py-1.5 rounded-lg ${view.name === 'comparison' ? 'bg-slate-100 text-slate-800' : 'text-slate-500'}`}>
              Baseline vs. Vetta
            </button>
          </nav>
          <span className="ml-auto text-xs text-slate-400">run: {RUN} · decisão final sempre humana</span>
        </div>
      </header>
      {view.name === 'queue' && <Queue onOpen={id => setView({ name: 'detail', id })} />}
      {view.name === 'detail' && <Detail id={view.id} onBack={() => setView({ name: 'queue' })} />}
      {view.name === 'comparison' && <Comparison />}
    </div>
  )
}
