export function EditorSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="editor-switch"><input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={event => onChange(event.target.checked)} /><span className="editor-switch-track" aria-hidden="true" /><span>{label}</span><small aria-hidden="true">{checked ? 'On' : 'Off'}</small></label>
}
