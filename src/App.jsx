import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import ChatPanel from './components/ChatPanel'
import UsagePanel from './components/UsagePanel'
import UpgradeModal from './components/UpgradeModal'
import PlanBadge from './components/PlanBadge'

function loadUserId() {
  try {
    return localStorage.getItem('ia-proxy-user') || 'estudiante'
  } catch {
    return 'estudiante'
  }
}

export default function App() {
  const [userId, setUserId] = useState(loadUserId)
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [resetIn, setResetIn] = useState(0)
  const [connectionError, setConnectionError] = useState('')
  const [modal, setModal] = useState(null) // null | 'quota' | 'manual'

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

  // Initial load and every time the user changes
  useEffect(() => {
    refresh()
  }, [refresh])

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

  const limit = status?.requestsPerMinuteLimit ?? null
  const rateLimited = limit !== null && status && status.requestsThisMinute >= limit
  const quotaExhausted = status?.tokensRemaining === 0

  async function sendPrompt(prompt) {
    setMessages((m) => [...m, { role: 'user', text: prompt }])
    setSending(true)
    try {
      const res = await api.generate(userId, prompt)
      setMessages((m) => [...m, { role: 'ai', text: res.text, tokens: res.totalTokens }])
    } catch (e) {
      if (e.status === 429) {
        setStatus((s) => (s ? { ...s, requestsThisMinute: s.requestsPerMinuteLimit } : s))
        if (e.retryAfter) setResetIn(e.retryAfter)
        setMessages((m) => [...m, { role: 'notice', text: `Limit of ${e.body?.limit} requests per minute reached. You can send again when the countdown ends.` }])
      } else if (e.status === 402) {
        setMessages((m) => [...m, { role: 'notice', text: 'Your monthly token quota is used up. Upgrade your plan to keep sending prompts.' }])
        setModal('quota')
      } else {
        setMessages((m) => [...m, { role: 'notice', text: e.message }])
      }
    } finally {
      setSending(false)
      refresh()
    }
  }

  async function handleUpgrade(plan) {
    const s = await api.upgrade(userId, plan)
    setStatus(s)
    setResetIn(s.rateLimitResetInSeconds)
    setMessages((m) => [...m, { role: 'notice', tone: 'ok', text: `Plan upgraded to ${s.plan}. You can keep sending prompts.` }])
    refresh()
  }

  function changeUser() {
    const next = window.prompt('Username (each user has their own quota):', userId)
    if (next && next.trim() && next.trim() !== userId) {
      const clean = next.trim().slice(0, 40)
      try {
        localStorage.setItem('ia-proxy-user', clean)
      } catch {
        /* no storage available: the name is kept for this session only */
      }
      setMessages([])
      setUserId(clean)
    }
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
          <button className="user-chip" onClick={changeUser} title="Switch user">
            {userId}
          </button>
        </div>
      </header>

      {connectionError && <div className="banner">{connectionError}</div>}

      <main className="layout">
        <ChatPanel
          messages={messages}
          sending={sending}
          onSend={sendPrompt}
          rateLimited={rateLimited}
          quotaExhausted={quotaExhausted}
          resetIn={resetIn}
          status={status}
          onUpgrade={() => setModal('quota')}
        />
        <UsagePanel
          status={status}
          history={history}
          resetIn={resetIn}
          rateLimited={rateLimited}
          onUpgrade={() => setModal('manual')}
        />
      </main>

      {modal && status && (
        <UpgradeModal
          reason={modal}
          currentPlan={status.plan}
          onClose={() => setModal(null)}
          onConfirm={handleUpgrade}
        />
      )}
    </div>
  )
}
