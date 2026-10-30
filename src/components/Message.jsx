import { useEffect, useState } from 'react'
import { fmt } from '../api'

const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

const LAYER_NAMES = {
  RateLimitProxy: 'Rate limit proxy',
  QuotaProxy: 'Quota proxy',
  MockAIGenerationService: 'AI model (mock)',
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Reveals the AI reply little by little, like a model streaming tokens. */
function useTypewriter(text, enabled, onDone) {
  const [shown, setShown] = useState(enabled && !prefersReducedMotion() ? 0 : text.length)

  useEffect(() => {
    if (shown >= text.length) return
    const id = setInterval(() => {
      setShown((n) => {
        const next = Math.min(text.length, n + 3)
        if (next >= text.length) {
          clearInterval(id)
          onDone?.()
        }
        return next
      })
    }, 16)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  return text.slice(0, shown)
}

function AiMessage({ msg, onSeen }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const text = useTypewriter(msg.text, msg.fresh, () => onSeen(msg.id))
  const typing = text.length < msg.text.length
  const totalMs = (msg.steps || []).reduce((s, x) => s + x.durationMs, 0)

  async function copy() {
    try {
      await navigator.clipboard.writeText(msg.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="msg msg-ai">
      <p>
        {text}
        {typing && <span className="caret" aria-hidden="true" />}
      </p>
      <div className="msg-foot">
        <span className="msg-meta">
          {fmt(msg.tokens)} tokens
          {msg.at && <> at {TIME.format(new Date(msg.at))}</>}
        </span>
        <span className="msg-actions">
          {msg.steps?.length > 0 && (
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? 'Hide request path' : 'Request path'}
            </button>
          )}
          <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </span>
      </div>
      {open && (
        <ol className="trace">
          {msg.steps.map((s, i) => (
            <li key={i}>
              <span className="trace-layer">{LAYER_NAMES[s.layer] ?? s.layer}</span>
              <span className="trace-detail">{s.detail}</span>
              <span className="trace-ms">{s.durationMs} ms</span>
            </li>
          ))}
          <li className="trace-total">
            <span className="trace-layer">Tokens</span>
            <span className="trace-detail">
              {fmt(msg.promptTokens)} prompt + {fmt(msg.completionTokens)} reply
            </span>
            <span className="trace-ms">{totalMs} ms</span>
          </li>
        </ol>
      )}
    </div>
  )
}

function BurstMessage({ msg }) {
  return (
    <div className="msg msg-burst">
      <p className="burst-title">
        {msg.ok} allowed, {msg.blocked} blocked by the rate limit
        {msg.other > 0 && `, ${msg.other} failed`}
      </p>
      <div className="burst-grid" role="img" aria-label={`${msg.ok} requests answered with 200 and ${msg.blocked} with 429`}>
        {msg.results.map((code, i) => (
          <span key={i} className={`burst-cell burst-${code === 200 ? 'ok' : code === 429 ? 'blocked' : 'other'}`}>
            {code || 'ERR'}
          </span>
        ))}
      </div>
      <p className="msg-meta">
        {msg.total} prompts sent at once. The allowed ones used {fmt(msg.tokens)} tokens.
      </p>
    </div>
  )
}

export default function Message({ msg, onSeen }) {
  if (msg.role === 'ai') return <AiMessage msg={msg} onSeen={onSeen} />
  if (msg.role === 'burst') return <BurstMessage msg={msg} />
  if (msg.role === 'notice') {
    return (
      <div className={`msg msg-notice ${msg.tone === 'ok' ? 'msg-ok' : ''}`} role="status">
        {msg.code && <span className="code-chip">{msg.code}</span>}
        <p>{msg.text}</p>
      </div>
    )
  }
  return (
    <div className="msg msg-user">
      <p>{msg.text}</p>
    </div>
  )
}
