import { useState, useEffect } from 'react'
import { Save, Plus, X, FolderOpen } from 'lucide-react'
import { api } from '../api/client'

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

function WatchPathsEditor() {
  const [paths, setPaths] = useState<string[]>([])
  const [newPath, setNewPath] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ paths: string[] }>('/config/watch-paths')
      .then(d => setPaths(d.paths))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const addPath = async () => {
    if (!newPath.trim()) return
    setError('')
    try {
      const res = await api.post<{ paths: string[] }>('/config/watch-paths/add', { path: newPath.trim() })
      setPaths(res.paths)
      setNewPath('')
    } catch (e: any) {
      setError(e.message || 'Failed to add path')
    }
  }

  const removePath = async (path: string) => {
    try {
      const res = await api.post<{ paths: string[] }>('/config/watch-paths/remove', { path })
      setPaths(res.paths)
    } catch { }
  }

  return (
    <SettingSection title="Log Watch Paths">
      <p className="text-xs text-stone-400 -mt-1">Directories the log viewer can browse. Changes take effect immediately.</p>
      {loading ? (
        <p className="text-xs text-stone-400">Loading...</p>
      ) : (
        <div className="space-y-1.5">
          {paths.map(p => (
            <div key={p} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg text-sm">
              <FolderOpen size={14} className="text-stone-400 shrink-0" />
              <span className="text-stone-600 font-mono text-xs flex-1 truncate">{p}</span>
              <button onClick={() => removePath(p)} className="p-0.5 rounded hover:bg-stone-200 text-stone-400 hover:text-danger shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
          {paths.length === 0 && <p className="text-xs text-stone-400">No watch paths configured</p>}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          placeholder="/path/to/logs/directory"
          value={newPath}
          onChange={e => setNewPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addPath()}
        />
        <button onClick={addPath}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-dim text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors">
          <Plus size={14} /> Add
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </SettingSection>
  )
}

export default function SettingsPage() {
  const [health, setHealth] = useState<{ status: string } | null>(null)
  const [config, setConfig] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => setHealth(null))
    api.get<Record<string, any>>('/config/yaml').then(setConfig).catch(() => {})
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

      <WatchPathsEditor />

      <SettingSection title="Slurm">
        <SettingField label="Default Partition" value={config?.slurm?.default_partition || ''} onChange={() => {}} placeholder="gpu" />
        <SettingField label="Default Account" value={config?.slurm?.default_account || ''} onChange={() => {}} placeholder="" />
        <SettingField label="Poll Interval (seconds)" type="number" value={String(config?.slurm?.poll_interval_seconds || 30)} onChange={() => {}} />
      </SettingSection>

      <SettingSection title="Email Notifications">
        <SettingField label="SMTP Host" value={config?.notifications?.smtp_host || ''} onChange={() => {}} placeholder="localhost" />
        <SettingField label="SMTP Port" value={String(config?.notifications?.smtp_port || 25)} onChange={() => {}} />
        <SettingField label="From Address" value={config?.notifications?.from_address || ''} onChange={() => {}} placeholder="user@localhost" />
        <SettingField label="To Address" value={config?.notifications?.to_address || ''} onChange={() => {}} placeholder="your@email.com" description="Email address to receive notifications" />
      </SettingSection>

      <SettingSection title="Notion Integration">
        <SettingField label="API Key" type="password" value={config?.notion?.api_key || ''} onChange={() => {}} placeholder="ntn_..." />
        <SettingField label="Database ID" value={config?.notion?.database_id || ''} onChange={() => {}} placeholder="..." />
      </SettingSection>

      <SettingSection title="Google Calendar">
        <SettingField label="Client ID" value={config?.google_calendar?.client_id || ''} onChange={() => {}} placeholder="..." />
        <SettingField label="Client Secret" type="password" value={config?.google_calendar?.client_secret || ''} onChange={() => {}} placeholder="..." />
        <SettingField label="Refresh Token" type="password" value={config?.google_calendar?.refresh_token || ''} onChange={() => {}} placeholder="..." />
        <p className="text-xs text-stone-400">
          Run <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">python3 scripts/google_auth.py</code> on a machine with a browser to get the refresh token.
        </p>
      </SettingSection>

      <SettingSection title="Security">
        <SettingField label="Bearer Token" type="password" value={config?.auth?.token || ''} onChange={() => {}} placeholder="Leave empty to disable auth"
          description="Set a token to require Authorization: Bearer <token> for all API requests" />
      </SettingSection>

      <div className="text-xs text-stone-400 space-y-1">
        <p>Most settings require editing <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">config/config.yaml</code> and restarting the server.</p>
        <p>Log watch paths can be changed live from above.</p>
        <p>Access via SSH tunnel: <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">ssh -L 8420:localhost:8420 della</code></p>
      </div>
    </div>
  )
}
