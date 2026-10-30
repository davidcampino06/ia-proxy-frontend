import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, FALLBACK_PLANS } from './api'
import ChatPanel from './components/ChatPanel'
import UsagePanel from './components/UsagePanel'
import UpgradeModal from './components/UpgradeModal'
import UserMenu from './components/UserMenu'
import PlanBadge from './components/PlanBadge'
import Toasts from './components/Toasts'

const STATUS_POLL_MS = 15000
const MAX_STORED_MESSAGES = 60

const IDLE_PIPELINE = { phase: 'idle', stage: -1, failedAt: null, code: null, steps: [] }

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: data lives only for this session */
  }
}

let nextId = Date.now()
const newId = () => ++nextId

export default function App() {
  const [userId, setUserId] = useState(() => storageGet('ia-proxy-user', 'student'))
  const [messages, setMessages] = useState(() => storageGet(`ia-proxy-chat:${userId}`, []))
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [plans, setPlans] = useState(FALLBACK_PLANS)
  const [sending, setSending] = useState(false)
  const [busyAction, setBusyAction] = useState(null)
  const [resetIn, setResetIn] = useState(0)
  const [connectionError, setConnectionError] = useState('')
  const [modal, setModal] = useState(null) // null | 'quota' | 'manual'
  const [pipeline, setPipeline] = useState(IDLE_PIPELINE)
  const [toasts, setToasts] = useState([])
  const pipelineTimers = useRef([])

  // ---------- Data loading ----------
  const refresh = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([api.status(userId), api.history(userId)])
      setStatus(s)
      setHistory(h)
      setResetIn(s.rateLimitResetInSeconds)
      setConnectionError('')
    } catch (e) {
      setConnectionError(e.message)
    }
  }, [userId])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, STATUS_POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    api.plans().then(setPlans).catch(() => {})
  }, [])

  // Countdown until the rate limit resets
  useEffect(() => {
    const id = setInterval(() => {
      setResetIn((s) => {
        if (s <= 1) {
          refresh()
          return 60
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [refresh])

  // Keep the chat of each user in the browser
  useEffect(() => {
    storageSet(`ia-proxy-chat:${userId}`, messages.slice(-MAX_STORED_MESSAGES))
  }, [messages, userId])

  // ---------- Helpers ----------
  const notify = useCallback((text, tone = 'info') => {
    const id = newId()
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const addMessage = (msg) =>
    setMessages((m) => [...m, { id: newId(), at: new Date().toISOString(), ...msg }])

  function clearPipelineTimers() {
    pipelineTimers.current.forEach(clearTimeout)
    pipelineTimers.current = []
  }

  // Lights up the chain stage by stage while the request travels
  function startPipeline() {
    clearPipelineTimers()
    setPipeline({ ...IDLE_PIPELINE, phase: 'running', stage: 0 })
    pipelineTimers.current.push(
      setTimeout(() => setPipeline((p) => (p.phase === 'running' ? { ...p, stage: 1 } : p)), 220),
      setTimeout(() => setPipeline((p) => (p.phase === 'running' ? { ...p, stage: 2 } : p)), 440),
    )
  }

  function finishPipeline(result) {
    clearPipelineTimers()
    setPipeline(result)
  }

  const limit = status?.requestsPerMinuteLimit ?? null
  const rateLimited = limit !== null && !!status && status.requestsThisMinute >= limit
  const quotaExhausted = status?.tokensRemaining === 0

  // ---------- Actions ----------
  async function sendPrompt(prompt) {
    addMessage({ role: 'user', text: prompt })
    setSending(true)
    startPipeline()
    try {
      const res = await api.generate(userId, prompt)
      finishPipeline({ phase: 'done', stage: 2, failedAt: null, code: 200, steps: res.steps || [] })
      addMessage({
        role: 'ai',
        text: res.text,
        tokens: res.totalTokens,
        promptTokens: res.promptTokens,
        completionTokens: res.completionTokens,
        steps: res.steps || [],
        fresh: true,
      })
    } catch (e) {
      handleBlocked(e)
    } finally {
      setSending(false)
      refresh()
    }
  }

  function handleBlocked(e) {
    if (e.status === 429) {
      finishPipeline({ phase: 'blocked', stage: 0, failedAt: 0, code: 429, steps: [] })
      setStatus((s) => (s ? { ...s, requestsThisMinute: s.requestsPerMinuteLimit } : s))
      if (e.retryAfter) setResetIn(e.retryAfter)
      addMessage({
        role: 'notice',
        code: 429,
        text: `You reached the limit of ${e.body?.limit} requests per minute. Sending is paused until the countdown ends.`,
      })
    } else if (e.status === 402) {
      finishPipeline({ phase: 'blocked', stage: 1, failedAt: 1, code: 402, steps: [] })
      addMessage({
        role: 'notice',
        code: 402,
        text: 'Your monthly token quota is used up. Upgrade your plan to keep sending prompts.',
      })
      setModal('quota')
    } else {
      finishPipeline(IDLE_PIPELINE)
      addMessage({ role: 'notice', code: e.status || null, text: e.message })
    }
  }

  // Sends limit + 1 prompts at the same time to show the rate limiter in action
  async function sendBurst() {
    const size = (limit ?? 10) - (status?.requestsThisMinute ?? 0) + 1
    if (size <= 0) return
    setBusyAction('burst')
    startPipeline()
    addMessage({ role: 'user', text: `Burst test: ${size} prompts sent at the same time` })
    const results = await Promise.allSettled(
      Array.from({ length: size }, (_, i) => api.generate(userId, `Burst test prompt #${i + 1}`)),
    )
    const ok = results.filter((r) => r.status === 'fulfilled')
    const blocked = results.filter((r) => r.status === 'rejected' && r.reason?.status === 429)
    const other = results.length - ok.length - blocked.length
    const tokens = ok.reduce((sum, r) => sum + (r.value.totalTokens || 0), 0)

    if (blocked.length > 0) {
      finishPipeline({ phase: 'blocked', stage: 0, failedAt: 0, code: 429, steps: [] })
      const retry = blocked[0].reason.retryAfter
      if (retry) setResetIn(retry)
    } else {
      finishPipeline({ phase: 'done', stage: 2, failedAt: null, code: 200, steps: ok[0]?.value.steps || [] })
    }

    addMessage({
      role: 'burst',
      total: results.length,
      ok: ok.length,
      blocked: blocked.length,
      other,
      tokens,
      results: results.map((r) => (r.status === 'fulfilled' ? 200 : r.reason?.status || 0)),
    })
    setBusyAction(null)
    refresh()
  }

  async function runDemo(action) {
    setBusyAction(action)
    try {
      if (action === 'exhaust') {
        await api.demo.exhaustQuota(userId)
        notify('Monthly quota used up. Your next prompt will get a 402.', 'warn')
      } else if (action === 'seed') {
        await api.demo.seedHistory(userId)
        notify('Sample usage added to the last 6 days.')
      } else if (action === 'reset') {
        await api.demo.reset(userId)
        setMessages([])
        finishPipeline(IDLE_PIPELINE)
        notify('Account reset to a new Free user.')
      }
    } catch (e) {
      notify(e instanceof ApiError && e.status === 404 ? 'Demo tools are turned off on the server.' : e.message, 'error')
    } finally {
      setBusyAction(null)
      refresh()
    }
  }

  async function handleUpgrade(plan) {
    const s = await api.upgrade(userId, plan)
    setStatus(s)
    setResetIn(s.rateLimitResetInSeconds)
    addMessage({ role: 'notice', tone: 'ok', text: `Plan upgraded to ${s.plan}. Your new limits are active now.` })
    notify(`You're on the ${s.plan} plan now.`, 'ok')
    refresh()
  }

  function switchUser(next) {
    setUserId(next)
    storageSet('ia-proxy-user', next)
    setMessages(storageGet(`ia-proxy-chat:${next}`, []))
    setStatus(null)
    setHistory([])
    finishPipeline(IDLE_PIPELINE)
  }

  function clearChat() {
    setMessages([])
    finishPipeline(IDLE_PIPELINE)
  }

  function markSeen(id) {
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, fresh: false } : x)))
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="brand-name">AI Meter</span>
        </div>
        <div className="topbar-user">
          {status && <PlanBadge plan={status.plan} />}
          <UserMenu userId={userId} onSwitch={switchUser} />
        </div>
      </header>

      {connectionError && (
        <div className="banner" role="alert">
          <span>{connectionError}</span>
          <button onClick={refresh}>Try again</button>
        </div>
      )}

      <main className="layout">
        <ChatPanel
          messages={messages}
          sending={sending || busyAction === 'burst'}
          onSend={sendPrompt}
          onClear={clearChat}
          onSeen={markSeen}
          rateLimited={rateLimited}
          quotaExhausted={quotaExhausted}
          resetIn={resetIn}
          status={status}
          pipeline={pipeline}
          onUpgrade={() => setModal('quota')}
        />
        <UsagePanel
          status={status}
          history={history}
          resetIn={resetIn}
          rateLimited={rateLimited}
          busyAction={busyAction}
          sending={sending}
          onUpgrade={() => setModal('manual')}
          onBurst={sendBurst}
          onDemo={runDemo}
        />
      </main>

      {modal && status && (
        <UpgradeModal
          reason={modal}
          currentPlan={status.plan}
          plans={plans}
          onClose={() => setModal(null)}
          onConfirm={handleUpgrade}
        />
      )}

      <Toasts toasts={toasts} />
    </div>
  )
}
