import { useEffect, useRef, useState } from 'react'
import { fmt, PLAN_NAMES, PLAN_ORDER } from '../api'

const PAYMENT_STEPS = ['Contacting the payment gateway', 'Authorizing the card', 'Activating your plan']

function describe(plan) {
  return {
    rpm: plan.requestsPerMinute === null ? 'Unlimited requests' : `${plan.requestsPerMinute} requests per minute`,
    tokens: plan.monthlyTokens === null ? 'Unlimited tokens' : `${fmt(plan.monthlyTokens)} tokens per month`,
  }
}

/**
 * Plan upgrade modal with a SIMULATED payment: no real payment is processed.
 */
export default function UpgradeModal({ reason, currentPlan, plans, onClose, onConfirm }) {
  const options = plans.filter((p) => PLAN_ORDER.indexOf(p.id) > PLAN_ORDER.indexOf(currentPlan))
  const current = plans.find((p) => p.id === currentPlan)
  const [selected, setSelected] = useState(options[0]?.id)
  const [step, setStep] = useState('choose') // choose | paying | done
  const [payStep, setPayStep] = useState(0)
  const [error, setError] = useState('')
  const [card, setCard] = useState({ name: '', number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' })
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && step !== 'paying' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, step])

  const plan = plans.find((p) => p.id === selected)

  function update(field, value) {
    if (field === 'number') value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    if (field === 'expiry') value = value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2')
    if (field === 'cvc') value = value.replace(/\D/g, '').slice(0, 4)
    setCard((c) => ({ ...c, [field]: value }))
  }

  function validate() {
    if (!card.name.trim()) return 'Enter the name on the card.'
    if (card.number.replace(/\s/g, '').length !== 16) return 'The card number must have 16 digits.'
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return 'Use MM/YY for the expiry date.'
    if (card.cvc.length < 3) return 'The CVC must have 3 or 4 digits.'
    return ''
  }

  async function pay(e) {
    e.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setStep('paying')
    try {
      for (let i = 0; i < PAYMENT_STEPS.length; i++) {
        setPayStep(i)
        await new Promise((r) => setTimeout(r, 650)) // simulates the payment gateway
      }
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
            <span className="done-mark" aria-hidden="true">✓</span>
            <h2 id="upgrade-title">You're on the {PLAN_NAMES[plan.id]} plan</h2>
            <p>
              {describe(plan).rpm} and {describe(plan).tokens.toLowerCase()}. Your new limits are active now.
            </p>
            <p className="receipt">
              Simulated charge: ${plan.monthlyPriceUsd}.00 to the card ending in {card.number.slice(-4)}
            </p>
            <button className="send" onClick={onClose} autoFocus>Back to chat</button>
          </div>
        ) : step === 'paying' ? (
          <div className="modal-paying" aria-live="polite">
            <h2 id="upgrade-title">Processing payment</h2>
            <ol className="pay-steps">
              {PAYMENT_STEPS.map((s, i) => (
                <li key={s} className={i < payStep ? 'is-done' : i === payStep ? 'is-active' : ''}>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <form onSubmit={pay} noValidate>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
            <h2 id="upgrade-title">
              {reason === 'quota' ? 'You ran out of tokens this month' : 'Upgrade your plan'}
            </h2>
            <p className="modal-sub">
              {reason === 'quota'
                ? 'Pick a plan to keep using the AI without waiting for next month.'
                : 'Get more requests per minute and more tokens per month.'}
            </p>

            {current && (
              <p className="current-plan">
                Now on {PLAN_NAMES[current.id]}: {describe(current).rpm.toLowerCase()}, {describe(current).tokens.toLowerCase()}.
              </p>
            )}

            <div className="plan-options" role="radiogroup" aria-label="Plans">
              {options.map((p) => {
                const d = describe(p)
                return (
                  <label key={p.id} className={`plan-option plan-${p.id.toLowerCase()} ${selected === p.id ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="plan"
                      value={p.id}
                      checked={selected === p.id}
                      onChange={() => setSelected(p.id)}
                    />
                    <span className="plan-option-name">{PLAN_NAMES[p.id]}</span>
                    <span className="plan-option-price">
                      ${p.monthlyPriceUsd}
                      <small>/month</small>
                    </span>
                    <span className="plan-option-detail">{d.rpm}</span>
                    <span className="plan-option-detail">{d.tokens}</span>
                  </label>
                )
              })}
            </div>

            <fieldset className="card-fields">
              <legend>Simulated payment. You will not be charged; the test card is filled in.</legend>
              <label>
                Name on card
                <input
                  value={card.name}
                  onChange={(e) => update('name', e.target.value)}
                  autoComplete="off"
                  placeholder="Your name"
                />
              </label>
              <label>
                Card number
                <input inputMode="numeric" value={card.number} onChange={(e) => update('number', e.target.value)} autoComplete="off" />
              </label>
              <div className="card-row">
                <label>
                  Expiry
                  <input inputMode="numeric" value={card.expiry} onChange={(e) => update('expiry', e.target.value)} autoComplete="off" />
                </label>
                <label>
                  CVC
                  <input inputMode="numeric" value={card.cvc} onChange={(e) => update('cvc', e.target.value)} autoComplete="off" />
                </label>
              </div>
            </fieldset>

            {error && <p className="form-error" role="alert">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="ghost" onClick={onClose}>
                Not now
              </button>
              <button type="submit" className="send" disabled={!plan}>
                Pay ${plan?.monthlyPriceUsd} and activate {PLAN_NAMES[plan?.id]}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
