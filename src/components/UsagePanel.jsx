import RequestPips from './RequestPips'
import HistoryChart from './HistoryChart'

const PLAN_COLOR = { FREE: '#5B6B82', PRO: '#6C3BD1', ENTERPRISE: '#A86A0C' }
const fmt = (n) => n.toLocaleString('en-US')

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export default function UsagePanel({ status, history, resetIn, rateLimited, onUpgrade }) {
  if (!status) {
    return <aside className="usage usage-loading">Loading your usage…</aside>
  }

  const color = PLAN_COLOR[status.plan]
  const unlimitedTokens = status.tokenLimit === null
  const pct = unlimitedTokens ? 0 : Math.min(100, (status.tokensUsed / status.tokenLimit) * 100)
  const level = pct >= 90 ? 'critical' : pct >= 70 ? 'warn' : 'ok'

  return (
    <aside className="usage" aria-label="Your usage" style={{ '--plan': color }}>
      <div className="usage-block">
        <h2>Tokens this month</h2>
        {unlimitedTokens ? (
          <>
            <p className="big-number">{fmt(status.tokensUsed)}</p>
            <p className="hint">tokens used. Your plan has no monthly limit.</p>
          </>
        ) : (
          <>
            <p className="big-number">
              {fmt(status.tokensRemaining)}
              <small> available</small>
            </p>
            <div
              className={`meter meter-${level}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={status.tokenLimit}
              aria-valuenow={status.tokensUsed}
              aria-label="Tokens used this month"
            >
              <span style={{ width: `${pct}%` }} />
            </div>
            <p className="hint">
              {fmt(status.tokensUsed)} of {fmt(status.tokenLimit)} used. Renews on{' '}
              {formatDate(status.resetDate)}.
            </p>
          </>
        )}
      </div>

      <div className={`usage-block ${rateLimited ? 'is-blocked' : ''}`}>
        <h2>Requests this minute</h2>
        <div className="rate-row">
          <p className="big-number">
            {status.requestsThisMinute}
            {status.requestsPerMinuteLimit !== null && <small> / {status.requestsPerMinuteLimit}</small>}
          </p>
          <p className={`countdown ${rateLimited ? 'countdown-alert' : ''}`} aria-live="polite">
            {rateLimited ? 'Blocked for ' : 'Resets in '}
            <strong>{resetIn}s</strong>
          </p>
        </div>
        <RequestPips used={status.requestsThisMinute} limit={status.requestsPerMinuteLimit} />
      </div>

      <div className="usage-block">
        <h2>Usage over the last 7 days</h2>
        <HistoryChart history={history} color={color} />
      </div>

      {status.plan !== 'ENTERPRISE' && (
        <button className="upgrade-link" onClick={onUpgrade}>
          {status.plan === 'FREE' ? 'Upgrade to Pro' : 'Upgrade to Enterprise'}
        </button>
      )}
    </aside>
  )
}
