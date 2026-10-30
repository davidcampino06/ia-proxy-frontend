import { useEffect, useRef, useState } from 'react'

const PLANS = [
  { id: 'PRO', name: 'Pro', price: 19, rpm: '60 requests/min', tokens: '500,000 tokens/month' },
  { id: 'ENTERPRISE', name: 'Enterprise', price: 99, rpm: 'Unlimited requests', tokens: 'Unlimited tokens' },
]
const ORDER = ['FREE', 'PRO', 'ENTERPRISE']

/**
 * Plan upgrade modal with a SIMULATED payment: no real payment is processed.
 */
export default function UpgradeModal({ reason, currentPlan, onClose, onConfirm }) {
  const options = PLANS.filter((p) => ORDER.indexOf(p.id) > ORDER.indexOf(currentPlan))
  const [selected, setSelected] = useState(options[0]?.id)
  const [step, setStep] = useState('choose') // choose | paying | done
  const [error, setError] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && step !== 'paying' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, step])

  const plan = PLANS.find((p) => p.id === selected)

  async function pay(e) {
    e.preventDefault()
    setError('')
    setStep('paying')
    try {
      await new Promise((r) => setTimeout(r, 1500)) // simulates the payment gateway
      await onConfirm(selected)
      setStep('done')
    } catch (err) {
      setError(err.message)
      setStep('choose')
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => step !== 'paying' && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'done' ? (
          <div className="modal-done">
            <h2 id="upgrade-title">You're on the {plan.name} plan</h2>
            <p>Your new limits are active now.</p>
            <button className="send" onClick={onClose}>Back to chat</button>
          </div>
        ) : (
          <form onSubmit={pay}>
            <h2 id="upgrade-title">
              {reason === 'quota' ? 'You ran out of tokens this month' : 'Upgrade your plan'}
            </h2>
            <p className="modal-sub">
              {reason === 'quota'
                ? 'Pick a plan to keep using the AI without waiting for next month.'
                : 'More requests per minute and more tokens per month.'}
            </p>

            <div className="plan-options" role="radiogroup" aria-label="Plans">
              {options.map((p) => (
                <label key={p.id} className={`plan-option plan-${p.id.toLowerCase()} ${selected === p.id ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="plan"
                    value={p.id}
                    checked={selected === p.id}
                    onChange={() => setSelected(p.id)}
                  />
                  <span className="plan-option-name">{p.name}</span>
                  <span className="plan-option-price">${p.price}<small>/month</small></span>
                  <span className="plan-option-detail">{p.rpm}</span>
                  <span className="plan-option-detail">{p.tokens}</span>
                </label>
              ))}
            </div>

            <fieldset className="card-fields" disabled={step === 'paying'}>
              <legend>Simulated payment: you will not be charged</legend>
              <label>
                Card number
                <input inputMode="numeric" defaultValue="4242 4242 4242 4242" readOnly />
              </label>
              <div className="card-row">
                <label>
                  Expires
                  <input defaultValue="12/30" readOnly />
                </label>
                <label>
                  CVC
                  <input defaultValue="123" readOnly />
                </label>
              </div>
            </fieldset>

            {error && <p className="form-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="ghost" onClick={onClose} disabled={step === 'paying'}>
                Not now
              </button>
              <button type="submit" className="send" disabled={step === 'paying' || !plan}>
                {step === 'paying' ? 'Processing payment…' : `Pay $${plan?.price} and activate ${plan?.name}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
