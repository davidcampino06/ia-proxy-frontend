const LABELS = { FREE: 'Free', PRO: 'Pro', ENTERPRISE: 'Enterprise' }

export default function PlanBadge({ plan }) {
  return (
    <span className={`plan-badge plan-${plan?.toLowerCase()}`} title={`Current plan: ${plan}`}>
      {LABELS[plan] ?? plan}
    </span>
  )
}
