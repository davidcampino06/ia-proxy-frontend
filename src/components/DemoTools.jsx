/**
 * Shortcuts to show every scenario of the workshop in a few clicks.
 * They use the /api/demo endpoints and the real proxy chain.
 */
export default function DemoTools({ status, busyAction, sending, onBurst, onDemo }) {
  const limit = status.requestsPerMinuteLimit
  const burstSize = limit === null ? null : Math.max(0, limit - status.requestsThisMinute) + 1
  const busy = busyAction !== null || sending
  const unlimitedTokens = status.tokenLimit === null

  const tools = [
    {
      key: 'burst',
      label: limit === null ? 'Burst unavailable' : `Send ${burstSize} prompts at once`,
      detail:
        limit === null
          ? 'Your plan has no requests-per-minute limit to hit.'
          : 'Fires one more request than you have left this minute, so the last one gets a 429.',
      run: onBurst,
      disabled: limit === null || status.requestsThisMinute >= limit,
    },
    {
      key: 'exhaust',
      label: 'Use up the monthly quota',
      detail: unlimitedTokens
        ? 'Enterprise has no monthly token limit.'
        : 'Your next prompt will be stopped by the quota proxy with a 402.',
      run: () => onDemo('exhaust'),
      disabled: unlimitedTokens || status.tokensRemaining === 0,
    },
    {
      key: 'seed',
      label: 'Add sample usage',
      detail: 'Fills the last 6 days so the history chart has data to show.',
      run: () => onDemo('seed'),
      disabled: false,
    },
    {
      key: 'reset',
      label: 'Reset account',
      detail: 'Back to a new Free user with no usage and an empty chat.',
      run: () => onDemo('reset'),
      disabled: false,
    },
  ]

  return (
    <div className="usage-block demo">
      <h2>Demo tools</h2>
      <p className="hint demo-intro">Shortcuts to show each scenario during the presentation.</p>
      <ul className="demo-list">
        {tools.map((t) => (
          <li key={t.key}>
            <button
              type="button"
              className={`demo-btn demo-${t.key}`}
              onClick={t.run}
              disabled={busy || t.disabled}
            >
              <span className="demo-label">{busyAction === t.key ? 'Working…' : t.label}</span>
              <span className="demo-detail">{t.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
