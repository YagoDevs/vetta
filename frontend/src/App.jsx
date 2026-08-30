import { useEffect, useRef, useState } from 'react'
import fire from './assets/fire.png'

const DECISION_STYLE = {
  AVANCAR: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  REVISAR: 'bg-amber-100 text-amber-800 border-amber-300',
  REPROVAR: 'bg-rose-100 text-rose-800 border-rose-300',
}
const DECISION_LABEL = { AVANCAR: '✓ Avançar', REVISAR: '⚠ Revisar', REPROVAR: '✕ Reprovar' }
const DEFECT_LABEL = {
  S1: 'Vazamento de dados: o modelo "viu" as respostas do teste durante o treino — a nota real dele é menor do que parece',
  S2: 'Trapaça acidental: usou a própria resposta (churn) para construir uma variável do modelo',
  S3: 'Número enganoso: celebra uma métrica que parece boa mas não significa qualidade neste problema',
  S4: 'Descartou dados em silêncio: a limpeza jogou fora boa parte das linhas sem avisar',
  E1: 'O número que escreveu não é o que o código produz: executamos e o resultado real é outro',
  E2: 'O código quebra: uma célula dá erro quando o notebook roda do zero',
  E3: 'Resultado instável: muda a cada execução porque não fixou a aleatoriedade',
  E4: 'Conclusão sem fonte: cita um resultado que nenhuma parte do código calcula',
}
const DEFECT_SHORT = {
  S1: 'vazamento de dados', S2: 'usa a resposta como pista', S3: 'número enganoso',
  S4: 'descartou dados em silêncio', E1: 'número declarado ≠ real',
  E2: 'código quebra', E3: 'resultado instável', E4: 'conclusão sem fonte',
}
const CRITERIA = {
  C1: ['Metodologia', 'o jeito de conduzir a análise é tecnicamente correto?'],
  C2: ['Código', 'o notebook roda do início ao fim, com resultado estável?'],
  C3: ['Integridade', 'os números escritos batem com o que o código produz?'],
  C4: ['Conclusões', 'o que ele conclui é sustentado pelos resultados?'],
}

const Badge = ({ decision }) => (
  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${DECISION_STYLE[decision] || ''}`}>
    {DECISION_LABEL[decision] || decision}
  </span>
)

const ScoreBar = ({ label, value }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-24 text-slate-500 truncate" title={CRITERIA[label]?.[1] || ''}>{CRITERIA[label]?.[0] || label}</span>
    <div className="flex-1 h-1.5 bg-slate-100 rounded">
      <div className={`h-1.5 rounded ${value <= 2 ? 'bg-rose-400' : value <= 3 ? 'bg-amber-400' : 'bg-emerald-400'}`}
           style={{ width: `${value * 20}%` }} />
    </div>
    <span className="w-4 text-slate-600 font-medium">{value}</span>
  </div>
)

// ================================================================ LANDING
// Tela escura com a chama ao fundo; explicacao central com texto surgindo
// devagar; setinha no meio convidando ao scroll; secao explicativa abaixo.
// As telas densas do app permanecem brancas.
function Landing({ onStart }) {
  const scrollDown = () =>
    document.getElementById('sobre')?.scrollIntoView({ behavior: 'smooth' })
  return (
    <div className="bg-black text-white">
      {/* ---- viewport 1: hero ---- */}
      <div className="relative min-h-screen overflow-hidden flex flex-col">
        <img src={fire} alt=""
             className="absolute inset-0 w-full h-full object-cover object-bottom" />
        <div className="absolute inset-0 bg-black/35" />

        <header className="relative z-10 grid grid-cols-3 items-center px-10 pt-7">
          <nav className="flex gap-6 text-[14px] text-white/70">
            <button onClick={scrollDown} className="hover:text-white transition">Como funciona</button>
            <button onClick={onStart} className="hover:text-white transition">Avaliações</button>
          </nav>
          <div className="text-center">
            <span className="text-2xl font-bold tracking-tight">vetta<span className="text-orange-400">.</span></span>
          </div>
          <div className="flex items-center justify-end gap-4">
            <button onClick={onStart} className="text-[14px] text-white/70 hover:text-white transition">Login</button>
            <button onClick={onStart}
                    className="flex items-center gap-3 bg-white text-black text-[14px] font-semibold pl-5 pr-1.5 py-1.5 rounded-xl hover:bg-orange-50 transition">
              Começar agora
              <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">›</span>
            </button>
          </div>
        </header>

        {/* explicacao central com motion */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8">
          <p className="rise rise-1 text-orange-400/90 text-sm font-medium tracking-[.25em] uppercase mb-6">
            vetta — triagem de assessments
          </p>
          <h1 className="rise rise-2 text-5xl md:text-6xl font-semibold leading-[1.15] tracking-tight mb-8 max-w-3xl">
            Confie no que executa,<br />não no que está escrito
          </h1>
          <p className="rise rise-3 text-white/70 text-lg leading-relaxed max-w-2xl mb-10">
            A vetta é um agente de IA que avalia os notebooks dos seus candidatos de data science
            executando o código de verdade — e confrontando cada afirmação do texto com o que
            a execução realmente produz. O que a leitura não pega, o fogo da execução revela.
          </p>
          <button onClick={onStart}
                  className="rise rise-4 flex items-center gap-4 bg-white text-black text-[15px] font-semibold pl-6 pr-1.5 py-1.5 rounded-xl hover:bg-orange-50 transition">
            Avaliar candidatos
            <span className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center text-lg">›</span>
          </button>
        </main>

        {/* setinha central convidando ao scroll */}
        <button onClick={scrollDown} aria-label="ver mais"
                className="rise rise-5 relative z-10 mx-auto mb-8 drift text-white/80 hover:text-white">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ---- viewport 2: o que e a vetta / como funciona (ainda escuro) ---- */}
      <section id="sobre" className="relative bg-black px-8 py-24">
        <div className="max-w-4xl mx-auto">
          <p className="text-orange-400 text-sm font-medium tracking-[.25em] uppercase mb-4">o problema</p>
          <h2 className="text-3xl md:text-4xl font-semibold leading-snug mb-6 max-w-2xl">
            Um notebook pode parecer ótimo — e estar errado de formas que a leitura não pega.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed max-w-2xl mb-16">
            Um AUC declarado que nenhuma célula reproduz. Um resultado que muda a cada execução
            porque ninguém fixou a seed. Uma célula que só funcionava pelo estado antigo do kernel.
            Revisar isso na mão custa 30-60 minutos por candidato de um sênior caro — e revisores
            diferentes divergem.
          </p>

          <p className="text-orange-400 text-sm font-medium tracking-[.25em] uppercase mb-8">como a vetta resolve</p>
          <div className="grid md:grid-cols-3 gap-10 mb-20">
            {[
              ['01', 'Executar', 'Cada notebook roda duas vezes em sandbox. Métricas reais, células quebradas, sensibilidade a seed — fatos, não impressões.'],
              ['02', 'Verificar', 'O agente confronta cada alegação do candidato com a execução: "AUC 0.93" que na verdade é 0.72 aparece na célula exata, com evidência.'],
              ['03', 'Decidir', 'Você recebe a fila rankeada por rubrica com tudo anotado — e registra a decisão final. O agente recomenda; quem decide é você.'],
            ].map(([n, t, d]) => (
              <div key={n} className="border-t border-white/15 pt-6">
                <p className="text-orange-400/80 text-sm font-mono mb-2">{n}</p>
                <p className="font-semibold text-lg mb-2">{t}</p>
                <p className="text-white/55 text-sm leading-relaxed">{d}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-white/15 pt-10">
            <div>
              <p className="font-semibold text-xl mb-1">Pronto para ver seus candidatos de verdade?</p>
              <p className="text-white/55 text-sm">Aponte a pasta de notebooks e a vetta faz o resto. Decisão final sempre humana.</p>
            </div>
            <button onClick={onStart}
                    className="shrink-0 flex items-center gap-3 bg-orange-500 text-black text-[15px] font-semibold pl-6 pr-1.5 py-1.5 rounded-xl hover:bg-orange-400 transition">
              Começar
              <span className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center">›</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

// ====================================================== HOME (avaliações)
function Evaluations({ onOpenRun, onNew }) {
  const [runs, setRuns] = useState(null)
  useEffect(() => {
    fetch('/api/runs').then(r => r.json()).then(setRuns)
  }, [])
  if (!runs) return <p className="text-stone-500 p-8">carregando…</p>
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Suas avaliações</h2>
          <p className="text-sm text-stone-400">cada avaliação é um lote de notebooks de candidatos</p>
        </div>
        <button onClick={onNew}
                className="bg-orange-500 text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-orange-400">
          + Nova avaliação
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="bg-white/5 border-2 border-dashed border-white/15 rounded-2xl p-14 text-center">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="text-stone-300 font-medium mb-1">Nenhuma avaliação ainda</p>
          <p className="text-sm text-stone-400 mb-5">
            Crie a primeira: dê um nome, aponte a pasta com os notebooks dos candidatos e o vetta faz o resto.
          </p>
          <button onClick={onNew}
                  className="bg-orange-500 text-black text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-orange-400">
            Criar primeira avaliação
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {runs.map(r => (
            <button key={r.run_id} onClick={() => onOpenRun(r.run_id)}
                    className="text-left bg-[#1f1f22] border border-white/10 rounded-xl px-5 py-4 hover:border-orange-500/40 hover:bg-white/[.07] transition flex items-center justify-between">
              <div>
                <p className="font-medium text-stone-100">{r.run_id}</p>
                <p className="text-xs text-stone-400">{r.candidates} candidatos
                  {r.has_baseline && ' · baseline comparada'}</p>
              </div>
              <span className="text-stone-600">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================== WIZARD / PIPELINE DE CRIACAO (tela cheia)
// Cada etapa ocupa a tela; ao prosseguir, o conteudo desliza para dentro.
function NewEvaluation({ onDone, onCancel }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  const [runId, setRunId] = useState(null)
  const [status, setStatus] = useState(null)
  const poll = useRef(null)

  const launch = () => {
    setError('')
    fetch('/api/evaluations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, notebooks_path: path, mode: 'live' }),
    }).then(async r => {
      if (!r.ok) throw new Error((await r.json()).detail || 'erro')
      return r.json()
    }).then(d => { setRunId(d.run_id); setStep(3) })
      .catch(e => setError(String(e.message || e)))
  }

  useEffect(() => {
    if (step !== 3 || !runId) return
    poll.current = setInterval(() => {
      fetch(`/api/runs/${runId}/status`).then(r => r.json()).then(s => {
        setStatus(s)
        if (s.state === 'done') { clearInterval(poll.current); onDone(runId) }
      })
    }, 2500)
    return () => clearInterval(poll.current)
  }, [step, runId])

  const stepNames = ['O processo', 'Nome', 'Notebooks', 'Avaliando']
  const Next = ({ disabled, onClick, children = 'Prosseguir' }) => (
    <button disabled={disabled} onClick={onClick}
            className="flex items-center gap-3 bg-white disabled:bg-stone-700 disabled:text-stone-400 text-black text-[15px] font-semibold pl-6 pr-1.5 py-1.5 rounded-xl hover:bg-orange-50 transition">
      {children}
      <span className="w-9 h-9 rounded-lg bg-orange-500 text-black flex items-center justify-center">›</span>
    </button>
  )

  return (
    <div className="fixed inset-0 bg-[#171717] z-50 flex flex-col">
      <header className="flex items-center justify-between px-10 pt-8">
        <span className="text-xl font-bold tracking-tight text-stone-100">vetta<span className="text-orange-500">.</span></span>
        <div className="flex items-center gap-0">
          {stepNames.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition
                     ${i < step ? 'bg-orange-500 text-black' : i === step ? 'bg-white text-black' : 'bg-white/10 text-stone-500'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs ${i === step ? 'text-stone-100 font-medium' : 'text-stone-400'}`}>{s}</span>
              </div>
              {i < 3 && <div className={`w-10 h-px mx-3 ${i < step ? 'bg-orange-500' : 'bg-white/15'}`} />}
            </div>
          ))}
        </div>
        <button onClick={onCancel} className="text-sm text-stone-500 hover:text-stone-300">sair</button>
      </header>

      <main className="flex-1 flex items-center justify-center px-8 overflow-hidden">
        {step === 0 && (
          <div key="s0" className="slide-in max-w-2xl text-center">
            <p className="text-orange-600 text-sm font-medium tracking-[.25em] uppercase mb-5">como funciona</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-stone-100 leading-snug mb-10">
              Você aponta os notebooks.<br />A vetta executa, verifica e organiza a evidência.
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-left mb-12">
              {[
                ['01 · Executar', 'Cada notebook roda 2x em sandbox: métricas reais, células quebradas, sensibilidade a seed.'],
                ['02 · Verificar', 'O agente confronta o que o candidato escreveu com o que o código produz — célula por célula.'],
                ['03 · Decidir', 'Você recebe a fila rankeada e registra a decisão final. Nada avança sem você.'],
              ].map(([t, d]) => (
                <div key={t} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-stone-100 text-sm font-semibold mb-1.5">{t}</p>
                  <p className="text-stone-500 text-sm leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center"><Next onClick={() => setStep(1)} /></div>
          </div>
        )}

        {step === 1 && (
          <div key="s1" className="slide-in max-w-xl w-full text-center">
            <p className="text-orange-600 text-sm font-medium tracking-[.25em] uppercase mb-5">passo 1 de 2</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-stone-100 mb-3">Como se chama esta avaliação?</h2>
            <p className="text-stone-400 mb-10">Normalmente o nome da vaga. Ex.: "Data Scientist Sr — agosto".</p>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
                   placeholder="nome da avaliação"
                   className="w-full bg-black/40 border border-white/20 text-stone-100 rounded-2xl px-5 py-4 text-lg text-center mb-10 focus:outline-none focus:border-orange-500" />
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setStep(0)} className="text-sm text-stone-500 hover:text-stone-300">← voltar</button>
              <Next disabled={!name.trim()} onClick={() => setStep(2)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="s2" className="slide-in max-w-xl w-full text-center">
            <p className="text-orange-600 text-sm font-medium tracking-[.25em] uppercase mb-5">passo 2 de 2</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-stone-100 mb-3">Onde estão os notebooks?</h2>
            <p className="text-stone-400 mb-10">
              Cole o caminho da pasta local com os <code className="bg-white/10 px-1.5 py-0.5 rounded">.ipynb</code> dos
              candidatos, como foram entregues. Cada arquivo = um candidato.
            </p>
            <input autoFocus value={path} onChange={e => setPath(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && path.trim() && launch()}
                   placeholder="/Users/voce/candidatos-vaga-x"
                   className="w-full bg-black/40 border border-white/20 text-stone-100 rounded-2xl px-5 py-4 font-mono text-sm text-center mb-3 focus:outline-none focus:border-orange-500" />
            {error && <p className="text-sm text-rose-400 mb-3">{error}</p>}
            <p className="text-xs text-stone-400 mb-10">execução em sandbox · decisão final sempre humana</p>
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setStep(1)} className="text-sm text-stone-500 hover:text-stone-300">← voltar</button>
              <Next disabled={!path.trim()} onClick={launch}>Iniciar avaliação</Next>
            </div>
          </div>
        )}

        {step === 3 && (
          <div key="s3" className="slide-in max-w-xl w-full text-center">
            {status?.state === 'error' ? (
              <>
                <p className="text-rose-400 text-xl font-semibold mb-4">A avaliação falhou</p>
                <pre className="text-xs text-left bg-white border border-rose-200 text-rose-300/90 p-4 rounded-2xl overflow-auto max-h-48 mb-6">{status.error}</pre>
                <button onClick={() => setStep(2)} className="text-sm text-stone-500 underline">← tentar de novo</button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 border-4 border-white/15 border-t-orange-500 rounded-full animate-spin mx-auto mb-8" />
                <h2 className="text-3xl font-semibold text-stone-100 mb-3">Avaliando candidatos…</h2>
                <p className="text-stone-500 mb-2">
                  {status ? `${status.completed ?? 0} de ${status.total} notebooks` : 'iniciando'}
                </p>
                <p className="text-sm text-stone-400 mb-10">executar → verificar → pontuar · ~20-30s por notebook ☕</p>
                <div className="w-full bg-white/10 rounded-full h-2 max-w-sm mx-auto">
                  <div className="bg-orange-500 h-2 rounded-full transition-all duration-700"
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

// ================================================================== FILA
function Queue({ run, onOpen }) {
  const [cands, setCands] = useState(null)
  useEffect(() => {
    fetch(`/api/runs/${run}/candidates`).then(r => r.json()).then(setCands)
  }, [run])
  if (!cands) return <p className="text-stone-500 p-8">carregando…</p>
  const top = cands.filter(c => c.decision === 'AVANCAR')
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-stone-100">{run} — {cands.length} candidatos</h2>
        <p className="text-sm text-stone-400">
          A vetta executou cada notebook, conferiu se o que o candidato escreveu bate com o que o
          código produz, e deu uma nota de 1 a 5 em quatro critérios. <b>{top.length} recomendados
          para avançar.</b> A decisão final é sua — clique num candidato para ver a evidência.
        </p>
      </div>

      <div className="mb-5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
        {Object.entries(CRITERIA).map(([k, [nome, desc]]) => (
          <p key={k} className="text-[11px] text-stone-400"><b className="text-stone-300">{nome}</b> — {desc}</p>
        ))}
      </div>

      <div className="grid gap-3">
        {[...cands].sort((a, b) => b.weighted_score - a.weighted_score).map((c, rank) => (
          <button key={c.id} onClick={() => onOpen(c.id)}
                  className="text-left bg-[#1f1f22] border border-white/10 rounded-xl p-5 hover:border-orange-500/40 hover:bg-white/[.07] transition">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-stone-600 font-semibold text-sm w-6">#{rank + 1}</span>
              <p className="font-semibold text-stone-100">{c.id.replace(/^nb\d+_/, '')}</p>
              <span className="text-xs text-stone-500">{c.id}</span>
              <div className="ml-auto flex items-center gap-3">
                {c.human_decision && (
                  <span className="text-[11px] text-orange-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                    sua decisão: {DECISION_LABEL[c.human_decision.decision]}
                  </span>
                )}
                <span className="text-sm text-stone-400">nota <b className="text-stone-100">{c.weighted_score.toFixed(1)}</b>/5</span>
                <Badge decision={c.decision} />
              </div>
            </div>

            <p className="text-sm text-stone-300 leading-relaxed mb-3 pl-9">{c.summary}</p>

            {c.findings?.length > 0 && (
              <div className="pl-9 mb-3 space-y-1">
                {c.findings.map((f, i) => (
                  <p key={i} className="text-xs leading-relaxed">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${f.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                    <b className={f.severity === 'critical' ? 'text-rose-300/90' : 'text-amber-300'}>
                      {DEFECT_SHORT[f.type] || f.type}:
                    </b>{' '}
                    <span className="text-stone-400">{DEFECT_LABEL[f.type]}</span>
                  </p>
                ))}
              </div>
            )}
            {c.n_findings === 0 && (
              <p className="pl-9 mb-3 text-xs text-emerald-400">
                ✓ Executamos tudo e conferimos cada número do texto — nenhum problema encontrado.
              </p>
            )}

            <div className="pl-9 grid sm:grid-cols-2 gap-x-8 gap-y-1 max-w-xl">
              {Object.entries(c.scores).map(([k, v]) => <ScoreBar key={k} label={k} value={v} />)}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ==================================== SYNTAX HIGHLIGHT (python, leve)
// tokenizador simples por regex — sem dependencia; cores estilo VS Code Dark
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
    <div className="bg-[#1e1e1e] font-mono text-[12.5px] leading-relaxed overflow-x-auto py-1">
      {lines.map((line, i) => (
        <div key={i} className="flex hover:bg-white/5">
          <span className="w-10 shrink-0 text-right pr-3 text-[#6e7681] select-none">{i + 1}</span>
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

// ============================================================== DETALHE
function Detail({ run, id, onBack }) {
  const [v, setV] = useState(null)
  const [tab, setTab] = useState('notebook')
  const [note, setNote] = useState('')
  useEffect(() => {
    fetch(`/api/runs/${run}/candidates/${id}`).then(r => r.json()).then(setV)
  }, [run, id])
  if (!v) return <p className="text-stone-500 p-8">carregando…</p>

  const decide = d =>
    fetch(`/api/runs/${run}/candidates/${id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: d, note }),
    }).then(() => fetch(`/api/runs/${run}/candidates/${id}`).then(r => r.json()).then(setV))

  return (
    <div className="max-w-5xl mx-auto p-6">
      <button onClick={onBack} className="text-sm text-orange-400 mb-4">← voltar à fila</button>
      <div className="bg-[#1f1f22] border border-white/10 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-stone-100">{v.notebook}</h2>
          <Badge decision={v.decision} />
        </div>
        <p className="text-sm text-stone-300 mb-3">{v.summary}</p>
        <div className="grid grid-cols-4 gap-4 max-w-md">
          {Object.entries(v.scores).map(([k, s]) => <ScoreBar key={k} label={k} value={s} />)}
        </div>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-4">
        <p className="text-sm font-medium text-indigo-200 mb-2">
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
                 className="flex-1 text-xs border border-indigo-500/30 rounded-lg px-2 py-1.5 bg-black/40 text-stone-200" />
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {['notebook', 'trajetoria'].map(t => (
          <button key={t} onClick={() => setTab(t)}
                  className={`text-sm px-3 py-1.5 rounded-lg ${tab === t ? 'bg-slate-800 text-white' : 'bg-[#1f1f22] border border-white/10 text-stone-300'}`}>
            {t === 'notebook' ? 'Notebook com evidência' : 'O que o agente fez'}
          </button>
        ))}
      </div>

      {tab === 'notebook' && (
        <div className="space-y-2">
          {v.cells.length === 0 && (
            <p className="text-sm text-stone-500">notebook original não disponível para renderizar — veja a trajetória.</p>
          )}
          {v.cells.map(c => (
            <div key={c.index}
                 className={`rounded-xl border ${c.findings.length ? 'border-rose-500/60 ring-2 ring-rose-500/20' : 'border-white/15'} overflow-hidden shadow-sm`}>
              {c.findings.map((f, i) => (
                <div key={i} className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2">
                  <p className="text-xs font-semibold text-rose-300">
                    {f.type} · {DEFECT_LABEL[f.type]} · {f.severity}
                  </p>
                  <p className="text-xs text-rose-300/90 mt-0.5"><b>Alegação:</b> {f.claim}</p>
                  <p className="text-xs text-rose-300/90"><b>Evidência executada:</b> {f.evidence}</p>
                </div>
              ))}
              {c.type === 'markdown' ? (
                <div className="px-4 py-3 bg-[#232019]">
                  <p className="text-[10px] text-stone-500 mb-1.5 font-mono">md · célula {c.index}</p>
                  <pre className="text-[13px] whitespace-pre-wrap font-sans text-stone-300 leading-relaxed">{c.source}</pre>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 bg-[#252526] px-3 py-1.5 border-b border-black/40">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    <span className="text-[10px] text-[#8b949e] font-mono ml-2">In [{c.index}] · python</span>
                  </div>
                  <CodeBlock source={c.source} />
                  {c.outputs.length > 0 && (
                    <div className="bg-[#161616] border-t border-black/50 px-3 py-2">
                      <p className="text-[10px] text-[#6e7681] font-mono mb-1">Out [{c.index}]</p>
                      <pre className={`text-xs font-mono whitespace-pre-wrap ${c.outputs.join('').includes('ERROR') ? 'text-[#f85149]' : 'text-[#8ddb8c]'}`}>
                        {c.outputs.join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'trajetoria' && (
        <div className="space-y-2">
          {v.trajectory.map((step, i) => (
            <div key={i} className="bg-[#1f1f22] border border-white/10 rounded-lg p-4">
              <p className="text-sm font-semibold text-stone-300 mb-1">{i + 1}. {step.agent}</p>
              <pre className="text-xs font-mono text-stone-400 whitespace-pre-wrap max-h-64 overflow-auto">
                {JSON.stringify({ ...step, input_facts: undefined }, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ========================================================== COMPARAÇÃO
function Comparison({ run }) {
  const [ev, setEv] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    fetch(`/api/runs/${run}/comparison`)
      .then(r => { if (!r.ok) throw 0; return r.json() })
      .then(setEv).catch(() => setErr(true))
  }, [run])
  if (err) return (
    <p className="text-stone-500 p-8 text-sm">
      Esta avaliação não tem comparação com baseline (disponível nas runs oficiais do estudo — official_a/b/c).
    </p>
  )
  if (!ev?.agent) return <p className="text-stone-500 p-8">carregando…</p>
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
      <h2 className="text-lg font-semibold text-stone-100 mb-1">Baseline vs. vetta</h2>
      <p className="text-sm text-stone-400 mb-5">
        Mesmos {ev.agent.notebooks} notebooks, mesmo modelo, mesma rubrica. A baseline lê o notebook
        já executado num prompt único; o vetta re-executa e verifica. A diferença concentra-se nos
        defeitos executáveis (E) — invisíveis sem rodar o código.
      </p>
      <div className="bg-[#1f1f22] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/30 text-stone-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">métrica</th>
              <th className="text-right px-4 py-2 font-medium">baseline</th>
              <th className="text-right px-4 py-2 font-medium">vetta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, b, a]) => (
              <tr key={label} className="border-t border-white/10">
                <td className="px-4 py-2 text-stone-300">{label}</td>
                <td className="px-4 py-2 text-right text-stone-400">{b ?? '—'}</td>
                <td className={`px-4 py-2 text-right font-semibold ${a > (b ?? 0) ? 'text-emerald-400' : a < b ? 'text-rose-400' : 'text-stone-300'}`}>{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid md:grid-cols-2 gap-3">
        {ev.agent.rows.map(r => (
          <div key={r.notebook} className="bg-[#1f1f22] border border-white/10 rounded-lg p-3 text-xs">
            <p className="font-medium text-stone-300 mb-1">{r.notebook}</p>
            <p className="text-stone-400">esperado {r.expected} · vetta {r.got} {r.decision_ok ? '✓' : '✗'}</p>
            {r.missed.length > 0 && <p className="text-rose-400">não detectou: {r.missed.join(', ')}</p>}
            {r.false_positives.length > 0 && <p className="text-amber-400">alarme falso: {r.false_positives.join(', ')}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================================================================== APP
export default function App() {
  const [view, setView] = useState({ name: 'landing' })
  const run = view.run

  if (view.name === 'landing')
    return <Landing onStart={() => setView({ name: 'home' })} />

  return (
    <div className="min-h-screen bg-[#151515]">
      <header className="bg-[#151515]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
          <button onClick={() => setView({ name: 'landing' })}
                  className="font-bold text-slate-900 tracking-tight">
            vetta<span className="text-indigo-500">.</span>
          </button>
          <nav className="flex gap-1 text-sm">
            <button onClick={() => setView({ name: 'home' })}
                    className={`px-3 py-1.5 rounded-lg ${view.name === 'home' ? 'bg-slate-100 text-stone-100' : 'text-stone-400'}`}>
              Avaliações
            </button>
            {run && (
              <>
                <button onClick={() => setView({ name: 'queue', run })}
                        className={`px-3 py-1.5 rounded-lg ${['queue', 'detail'].includes(view.name) ? 'bg-slate-100 text-stone-100' : 'text-stone-400'}`}>
                  Candidatos
                </button>
                <button onClick={() => setView({ name: 'comparison', run })}
                        className={`px-3 py-1.5 rounded-lg ${view.name === 'comparison' ? 'bg-slate-100 text-stone-100' : 'text-stone-400'}`}>
                  Baseline vs. vetta
                </button>
              </>
            )}
          </nav>
          <span className="ml-auto text-xs text-stone-500">
            {run ? `avaliação: ${run} · ` : ''}decisão final sempre humana
          </span>
        </div>
      </header>

      {view.name === 'home' && (
        <Evaluations onOpenRun={r => setView({ name: 'queue', run: r })}
                     onNew={() => setView({ name: 'new' })} />
      )}
      {view.name === 'new' && (
        <NewEvaluation onDone={r => setView({ name: 'queue', run: r })}
                       onCancel={() => setView({ name: 'home' })} />
      )}
      {view.name === 'queue' && <Queue run={run} onOpen={id => setView({ name: 'detail', run, id })} />}
      {view.name === 'detail' && <Detail run={run} id={view.id} onBack={() => setView({ name: 'queue', run })} />}
      {view.name === 'comparison' && <Comparison run={run} />}
    </div>
  )
}
