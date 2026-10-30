import { fmt, PLAN_COLORS, PLAN_NAMES } from '../api'
import RequestPips from './RequestPips'
import HistoryChart from './HistoryChart'
import DemoTools from './DemoTools'
import PlanBadge from './PlanBadge'

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function daysUntil(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(y, m - 1, d) - today) / 86400000)
}

export default function UsagePanel({
  status, history, resetIn, rateLimited, busyAction, sending, onUpgrade, onBurst, onDemo,
}) {
  if (!status) {
    return (
      <aside className="usage usage-loading" aria-busy="true">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-number" />
        <div className="skeleton skeleton-bar" />
        <p>Loading your usage…</p>
      </aside>
    )
  }

  const color = PLAN_COLORS[status.plan]
  const unlimitedTokens = status.tokenLimit === null
  const pct = unlimitedTokens ? 0 : Math.min(100, (status.tokensUsed / status.tokenLimit) * 100)
  const level = pct >= 90 ? 'critical' : pct >= 70 ? 'warn' : 'ok'
  const days = daysUntil(status.resetDate)
  const todayTokens = history.length ? history[history.length - 1].tokens : 0
  const avgDaily = history.length ? Math.round(history.reduce((s, d) => s + d.tokens, 0) / history.length) : 0
  const daysLeftAtPace =
    !unlimitedTokens && avgDaily > 0 ? Math.floor(status.tokensRemaining / avgDaily) : null

  return (
    <aside className="usage" aria-label="Your usage" style={{ '--plan': color }}>
      <div className="usage-block plan-block">
        <div>
          <h2>Your plan</h2>
          <p className="plan-line">
            <PlanBadge plan={status.plan} size="lg" />
          </p>
          <p className="hint">
            {status.requestsPerMinuteLimit === null ? 'Unlimited requests' : `${status.requestsPerMinuteLimit} requests per minute`}
            {', '}
            {unlimitedTokens ? 'unlimited tokens' : `${fmt(status.tokenLimit)} tokens per month`}
          </p>
        </div>
        {status.plan !== 'ENTERPRISE' && (
          <button className="upgrade-link" onClick={onUpgrade}>
            Upgrade to {PLAN_NAMES[status.plan === 'FREE' ? 'PRO' : 'ENTERPRISE']}
          </button>
        )}
      </div>

      <div className={`usage-block ${level === 'critical' ? 'is-critical' : ''}`}>
        <h2>Tokens this month</h2>
        {unlimitedTokens ? (
          <>
            <p className="big-number">{fmt(status.tokensUsed)}</p>
            <p className="hint">Tokens used. Your plan has no monthly limit.</p>
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
            <div className="meter-legend">
              <span>{fmt(status.tokensUsed)} used</span>
              <span>{pct.toFixed(pct < 10 && pct > 0 ? 1 : 0)}%</span>
            </div>
          </>
        )}
        <dl className="facts">
          <div>
            <dt>Today</dt>
            <dd>{fmt(todayTokens)} tokens</dd>
          </div>
          <div>
            <dt>Renews</dt>
            <dd>
              {formatDate(status.resetDate)}
              <small> in {days} {days === 1 ? 'day' : 'days'}</small>
            </dd>
          </div>
          {daysLeftAtPace !== null && (
            <div>
              <dt>At your pace</dt>
              <dd>{daysLeftAtPace >= days ? 'Lasts until renewal' : `Runs out in ~${daysLeftAtPace} days`}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className={`usage-block ${rateLimited ? 'is-blocked' : ''}`}>
        <h2>Requests this minute</h2>
        <div className="rate-row">
          <p className="big-number">
            {status.requestsThisMinute}
            {status.requestsPerMinuteLimit !== null && <small> / {status.requestsPerMinuteLimit}</small>}
          </p>
          <p className={`countdown ${rateLimited ? 'countdown-alert' : ''}`} aria-live="off">
            {rateLimited ? 'Unlocks in ' : 'Resets in '}
            <strong>{resetIn}s</strong>
          </p>
        </div>
        <RequestPips used={status.requestsThisMinute} limit={status.requestsPerMinuteLimit} />
        <div className="minute-bar" aria-hidden="true">
          <span style={{ width: `${((60 - resetIn) / 60) * 100}%` }} />
        </div>
      </div>

      <div className="usage-block">
        <h2>Usage over the last 7 days</h2>
        <HistoryChart history={history} color={color} />
      </div>

      <DemoTools
        status={status}
        busyAction={busyAction}
        sending={sending}
        onBurst={onBurst}
        onDemo={onDemo}
      />
    </aside>
  )
}
