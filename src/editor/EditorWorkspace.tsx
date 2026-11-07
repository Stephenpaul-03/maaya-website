import { Children, useEffect, useState, type ReactNode } from 'react'

/** Keep both panes mounted so switching views never discards a draft. */
export function EditorWorkspace({ children }: { children: ReactNode }) {
  const [view, setView] = useState<'form' | 'split' | 'preview'>('split')
  const [compact, setCompact] = useState(false)
  const [validation, setValidation] = useState('')
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 1050px)')
    if (!media) return
    const update = () => setCompact(media.matches)
    update(); media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const active = compact && view === 'split' ? 'form' : view
  const panes = Children.toArray(children)
  return <div className="editor-workspace-shell" onInvalidCapture={event => {
    event.preventDefault(); setView('form')
    const field = event.target as HTMLInputElement
    setValidation('Please complete the required fields before saving. ' + field.validationMessage)
    window.requestAnimationFrame(() => field.focus())
  }}>
    <div className="editor-workspace-tabs" role="group" aria-label="Workspace layout">
      <button type="button" aria-pressed={active === 'form'} onClick={() => setView('form')}>Form only</button>
      {!compact && <button type="button" aria-pressed={active === 'split'} onClick={() => setView('split')}>Split view</button>}
      <button type="button" aria-pressed={active === 'preview'} onClick={() => setView('preview')}>Preview only</button>
      <small>Switch views without losing your changes.</small>
      {validation && <span role="alert">{validation}</span>}
    </div>
    <div className={`editor-create-workspace workspace-${active}`}>
      <div className="editor-form-pane" hidden={active === 'preview'}>{panes[0]}</div>
      <div className="editor-preview-pane" hidden={active === 'form'}>{panes[1]}</div>
    </div>
  </div>
}
