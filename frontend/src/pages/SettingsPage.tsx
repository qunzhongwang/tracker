import { useState, useEffect } from 'react'
import { Save, CheckCircle } from 'lucide-react'

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-5">
      <h3 className="text-sm font-medium text-stone-600 mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function SettingField({ label, type = 'text', value, onChange, placeholder, description }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; description?: string
}) {
  return (
    <div>
      <label className="text-xs text-stone-500 mb-1 block">{label}</label>
      <input
        type={type}
        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {description && <p className="text-xs text-stone-400 mt-1">{description}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [health, setHealth] = useState<{ status: string } | null>(null)

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => setHealth(null))
  }, [])

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-stone-900">Settings</h1>

      {/* Server Status */}
      <div className="bg-white rounded-lg border border-stone-200 p-5">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${health?.status === 'ok' ? 'bg-success' : 'bg-danger'}`} />
          <span className="text-sm text-stone-600">
            Server: {health?.status === 'ok' ? 'Running' : 'Unreachable'}
          </span>
        </div>
      </div>

      <SettingSection title="Slurm">
        <SettingField label="Default Partition" value="" onChange={() => {}} placeholder="gpu" />
        <SettingField label="Default Account" value="" onChange={() => {}} placeholder="" />
        <SettingField label="Poll Interval (seconds)" type="number" value="30" onChange={() => {}} />
      </SettingSection>

      <SettingSection title="Email Notifications">
        <SettingField label="SMTP Host" value="" onChange={() => {}} placeholder="localhost" />
        <SettingField label="SMTP Port" value="25" onChange={() => {}} />
        <SettingField label="From Address" value="" onChange={() => {}} placeholder="user@localhost" />
        <SettingField label="To Address" value="" onChange={() => {}} placeholder="your@email.com" description="Email address to receive notifications" />
      </SettingSection>

      <SettingSection title="Notion Integration">
        <SettingField label="API Key" type="password" value="" onChange={() => {}} placeholder="ntn_..." />
        <SettingField label="Database ID" value="" onChange={() => {}} placeholder="..." />
      </SettingSection>

      <SettingSection title="Google Calendar">
        <SettingField label="Client ID" value="" onChange={() => {}} placeholder="..." />
        <SettingField label="Client Secret" type="password" value="" onChange={() => {}} placeholder="..." />
        <SettingField label="Refresh Token" type="password" value="" onChange={() => {}} placeholder="..." />
        <p className="text-xs text-stone-400">
          Run <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">python3 scripts/google_auth.py</code> on a machine with a browser to get the refresh token.
        </p>
      </SettingSection>

      <SettingSection title="Security">
        <SettingField label="Bearer Token" type="password" value="" onChange={() => {}} placeholder="Leave empty to disable auth"
          description="Set a token to require Authorization: Bearer <token> for all API requests" />
      </SettingSection>

      <div className="text-xs text-stone-400 space-y-1">
        <p>Settings are stored in <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">config/config.yaml</code></p>
        <p>Edit the file directly and restart the server, or use the API.</p>
        <p>Recommended: Access via SSH tunnel: <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">ssh -L 8420:localhost:8420 della</code></p>
      </div>
    </div>
  )
}
