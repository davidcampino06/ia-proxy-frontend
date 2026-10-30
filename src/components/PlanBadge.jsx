import { PLAN_NAMES } from '../api'

export default function PlanBadge({ plan, size = 'md' }) {
  return (
    <span className={`plan-badge plan-${plan?.toLowerCase()} plan-badge-${size}`} title={`Current plan: ${plan}`}>
      {PLAN_NAMES[plan] ?? plan}
    </span>
  )
}
