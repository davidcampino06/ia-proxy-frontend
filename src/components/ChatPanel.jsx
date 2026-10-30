import { useEffect, useRef, useState } from 'react'
import { estimateTokens } from '../api'

const fmt = (n) => n.toLocaleString('en-US')

const SUGGESTIONS = [
  'What is the Proxy pattern?',
  'Explain what a rate limiter is',
  'Give me an example of lazy loading',
]

export default function ChatPanel({
  messages, sending, onSend, rateLimited, quotaExhausted, resetIn, status, onUpgrade,
}) {
  const [prompt, setPrompt] = useState('')
  const listRef = useRef(null)
  const estimate = estimateTokens(prompt)
  const remaining = status?.tokensRemaining ?? null
  const exceedsQuota = remaining !== null && estimate > remaining

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const disabled = sending || rateLimited || !prompt.trim() || !status

  function submit(e) {
    e?.preventDefault()
    if (quotaExhausted && !sending) {
      onUpgrade()
      return
    }
    if (disabled) return
    if (exceedsQuota) {
      onUpgrade()
      return
    }
    onSend(prompt.trim())
    setPrompt('')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) submit(e)
  }

  let buttonLabel = 'Send'
  if (sending) buttonLabel = 'Generating…'
  else if (rateLimited) buttonLabel = `Wait ${resetIn}s`
  else if (quotaExhausted) buttonLabel = 'Upgrade plan'

  return (
    <section className="chat" aria-label="Chat with the AI">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <h1>Ask the AI something</h1>
            <p>
              Every prompt goes through two proxies before it reaches the model: first the
              requests-per-minute limit, then your monthly token quota.
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => setPrompt(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role} ${m.tone ? `msg-${m.tone}` : ''}`}>
            <p>{m.text}</p>
            {m.role === 'ai' && <span className="msg-meta">{fmt(m.tokens)} tokens</span>}
          </div>
        ))}

        {sending && (
          <div className="msg msg-ai msg-thinking" aria-live="polite">
            <span /><span /><span />
            <span className="sr-only">The AI is generating a reply</span>
          </div>
        )}
      </div>

      <form className="composer" onSubmit={submit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={rateLimited ? `Limit reached. You can send again in ${resetIn}s` : 'Type your prompt…'}
          rows={2}
          maxLength={4000}
          aria-label="Prompt"
        />
        <div className="composer-bar">
          <span className={`estimate ${exceedsQuota ? 'estimate-over' : ''}`} aria-live="polite">
            {estimate === 0
              ? 'The token estimate appears as you type'
              : exceedsQuota
                ? `≈ ${fmt(estimate)} tokens: more than your ${fmt(remaining)} remaining`
                : `This prompt will use ≈ ${fmt(estimate)} tokens plus the reply`}
          </span>
          <button
            type="submit"
            className={`send ${rateLimited ? 'send-wait' : ''}`}
            disabled={disabled && !(quotaExhausted && !sending)}
          >
            {buttonLabel}
          </button>
        </div>
      </form>
    </section>
  )
}
