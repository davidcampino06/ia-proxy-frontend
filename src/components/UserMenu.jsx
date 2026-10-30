import { useEffect, useRef, useState } from 'react'

/**
 * Shows the current user and lets you switch to another one.
 * Every user has their own plan, quota and chat.
 */
export default function UserMenu({ userId, onSwitch }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(userId)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    setValue(userId)
    setOpen((o) => !o)
  }

  function submit(e) {
    e.preventDefault()
    const clean = value.trim().slice(0, 40)
    if (clean && clean !== userId) onSwitch(clean)
    setOpen(false)
  }

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-chip" onClick={toggle} aria-expanded={open} aria-haspopup="dialog">
        <span className="user-avatar" aria-hidden="true">{userId.charAt(0).toUpperCase()}</span>
        <span className="user-name">{userId}</span>
      </button>
      {open && (
        <form className="user-pop" onSubmit={submit} role="dialog" aria-label="Switch user">
          <label htmlFor="user-input">Switch user</label>
          <p>Each user has their own plan, quota and chat history.</p>
          <div className="user-pop-row">
            <input
              id="user-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={40}
              autoFocus
              autoComplete="off"
            />
            <button type="submit" className="send send-sm">Switch</button>
          </div>
        </form>
      )}
    </div>
  )
}
