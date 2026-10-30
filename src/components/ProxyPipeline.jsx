/**
 * Live view of the proxy chain a prompt goes through:
 * RateLimitProxy -> QuotaProxy -> AI model.
 * Each node lights up while the request travels and turns red where it was blocked.
 */
const NODES = [
  { key: 'rate', title: 'Rate limit', blocked: '429 Too Many Requests' },
  { key: 'quota', title: 'Monthly quota', blocked: '402 Payment Required' },
  { key: 'model', title: 'AI model', blocked: '' },
]

function nodeState(pipeline, index) {
  const { phase, stage, failedAt } = pipeline
  if (phase === 'idle') return 'idle'
  if (phase === 'blocked') {
    if (index < failedAt) return 'passed'
    if (index === failedAt) return 'failed'
    return 'skipped'
  }
  if (phase === 'done') return 'passed'
  if (index < stage) return 'passed'
  if (index === stage) return 'active'
  return 'idle'
}

function caption(pipeline, index, state) {
  if (state === 'failed') return NODES[index].blocked
  if (state === 'skipped') return 'Not reached'
  if (state === 'active') return index === 2 ? 'Generating…' : 'Checking…'
  if (pipeline.phase === 'done' && pipeline.steps[index]) {
    return `${pipeline.steps[index].durationMs} ms`
  }
  if (state === 'passed') return 'Passed'
  return index === 2 ? 'Waiting' : 'Ready'
}

export default function ProxyPipeline({ pipeline }) {
  const summary =
    pipeline.phase === 'idle'
      ? 'Send a prompt to watch it travel through the proxies'
      : pipeline.phase === 'running'
        ? 'Request in progress'
        : pipeline.phase === 'done'
          ? 'Reply delivered: the request passed every proxy'
          : pipeline.failedAt === 0
            ? 'Stopped by the rate limit proxy'
            : 'Stopped by the quota proxy'

  return (
    <div className={`pipeline pipeline-${pipeline.phase}`} aria-label="Proxy chain" role="group">
      <p className="pipeline-summary" aria-live="polite">{summary}</p>
      <ol className="pipeline-nodes">
        {NODES.map((node, i) => {
          const state = nodeState(pipeline, i)
          return (
            <li key={node.key} className={`pnode pnode-${state}`}>
              <span className="pnode-dot" aria-hidden="true">
                {state === 'passed' ? '✓' : state === 'failed' ? '✕' : i + 1}
              </span>
              <span className="pnode-text">
                <span className="pnode-title">{node.title}</span>
                <span className="pnode-caption">{caption(pipeline, i, state)}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
