import { useEffect, useRef, useState } from 'react'
import { estimateTokens, fmt } from '../api'
import Message from './Message'
import ProxyPipeline from './ProxyPipeline'

const MAX_CHARS = 4000

const SUGGESTIONS = [
  'What is the Proxy pattern?',
  'Explain what a rate limiter is',
  'Give me an example of lazy loading',
  'Why do AI platforms charge by tokens?',
]

export default function ChatPanel({
  messages, sending, onSend, onClear, onSeen, rateLimited, quotaExhausted, resetIn, status, pipeline, onUpgrade,
}) {
  const [prompt, setPrompt] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const estimate = estimateTokens(prompt)
  const remaining = status?.tokensRemaining ?? null
  const exceedsQuota = remaining !== null && estimate > remaining
  const lastText = messages.length ? messages[messages.length - 1].text : ''

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, sending, lastText])

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
    inputRef.current?.focus()
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) submit(e)
  }

  function pickSuggestion(s) {
    setPrompt(s)
    inputRef.current?.focus()
  }

  let buttonLabel = 'Send'
  if (sending) buttonLabel = 'Generating…'
  else if (rateLimited) buttonLabel = `Wait ${resetIn}s`
  else if (quotaExhausted) buttonLabel = 'Upgrade plan'

  return (
    <section className="chat" aria-label="Chat with the AI">
      <div className="chat-head">
        <ProxyPipeline pipeline={pipeline} />
        {messages.length > 0 && (
          <button type="button" className="ghost ghost-sm" onClick={onClear}>
            Clear chat
          </button>
        )}
      </div>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <h1>Ask the AI something</h1>
            <p>
              Every prompt goes through two proxies before it reaches the model: first the
              requests-per-minute limit, then your monthly token quota. Watch the path light up
              above as your request travels.
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => pickSuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <Message key={m.id} msg={m} onSeen={onSeen} />
        ))}

        {sending && (
          <div className="msg msg-ai msg-thinking" aria-live="polite">
            <span /><span /><span />
            <span className="sr-only">The AI is generating a reply</span>
          </div>
        )}
      </div>

      {rateLimited && (
        <div className="lockout" role="status">
          <div className="lockout-ring" style={{ '--p': Math.max(0, Math.min(1, resetIn / 60)) }} aria-hidden="true">
            <span>{resetIn}</span>
          </div>
          <div>
            <strong>Rate limit reached</strong>
            <p>You can send again in {resetIn} seconds, when the minute resets.</p>
          </div>
          <button type="button" className="ghost ghost-sm" onClick={onUpgrade}>Get more requests</button>
        </div>
      )}

      <form className={`composer ${rateLimited ? 'composer-locked' : ''}`} onSubmit={submit}>
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={rateLimited ? `Sending is paused for ${resetIn}s` : 'Type your prompt…'}
          rows={2}
          maxLength={MAX_CHARS}
          aria-label="Prompt"
          aria-describedby="token-estimate"
        />
        <div className="composer-bar">
          <div className="composer-info">
            <span
              id="token-estimate"
              className={`estimate ${exceedsQuota ? 'estimate-over' : ''} ${estimate > 0 ? 'estimate-on' : ''}`}
              aria-live="polite"
            >
              {estimate === 0
                ? 'The token estimate appears as you type'
                : exceedsQuota
                  ? `≈ ${fmt(estimate)} tokens, more than your ${fmt(remaining)} left`
                  : `≈ ${fmt(estimate)} tokens for this prompt, plus the reply`}
            </span>
            <span className="composer-hint">
              {prompt.length > 0 ? `${fmt(prompt.length)} / ${fmt(MAX_CHARS)} characters` : 'Enter to send, Shift + Enter for a new line'}
            </span>
          </div>
          <button
            type="submit"
            className={`send ${rateLimited ? 'send-wait' : ''} ${quotaExhausted && !sending ? 'send-upgrade' : ''}`}
            disabled={disabled && !(quotaExhausted && !sending)}
          >
            {buttonLabel}
          </button>
        </div>
      </form>
    </section>
  )
}
