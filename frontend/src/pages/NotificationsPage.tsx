import { useState } from 'react'
import { Plus, Trash2, Bell, BellOff, CheckCircle, XCircle } from 'lucide-react'
import { useNotificationRules, useCreateRule, useDeleteRule, useNotificationLog } from '../hooks/useNotifications'
import type { NotificationRule } from '../types'

const EVENT_TYPES = ['job_completed', 'job_failed', 'job_started', 'job_cancelled']

function RuleCard({ rule, onDelete }: { rule: NotificationRule; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {rule.enabled ? <Bell size={16} className="text-accent" /> : <BellOff size={16} className="text-stone-400" />}
          <div>
            <h4 className="text-sm font-medium text-stone-700">{rule.name}</h4>
            <p className="text-xs text-stone-400 mt-0.5">
              Trigger: <span className="text-stone-500">{rule.event_type}</span>
              {' | '}Action: <span className="text-stone-500">{rule.action_type}</span>
            </p>
          </div>
        </div>
        <button onClick={onDelete} className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-danger">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function CreateRuleForm({ onSubmit }: { onSubmit: (rule: NotificationRule) => void }) {
  const [form, setForm] = useState<NotificationRule>({
    name: '', enabled: true, event_type: 'job_completed', condition_json: '{}', action_type: 'email', action_config: '{}'
  })

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-5 space-y-3">
      <h3 className="text-sm font-medium text-stone-500">New Rule</h3>
      <input className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
        placeholder="Rule name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
        value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
        {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
      </select>
      <button onClick={() => {
        if (!form.name) return
        onSubmit(form)
        setForm({ name: '', enabled: true, event_type: 'job_completed', condition_json: '{}', action_type: 'email', action_config: '{}' })
      }} className="flex items-center gap-2 bg-accent hover:bg-accent-dim text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
        <Plus size={14} /> Create Rule
      </button>
    </div>
  )
}

export default function NotificationsPage() {
  const { data: rulesData } = useNotificationRules()
  const { data: logData } = useNotificationLog()
  const createRule = useCreateRule()
  const deleteRule = useDeleteRule()

  const rules = rulesData?.rules || []
  const logEntries = logData?.entries || []

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-stone-900">Notifications</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium text-stone-400">Active Rules</h2>
          {rules.map(r => (
            <RuleCard key={r.id} rule={r} onDelete={() => r.id && deleteRule.mutate(r.id)} />
          ))}
          {rules.length === 0 && (
            <div className="bg-white rounded-lg border border-stone-200 p-8 text-center text-stone-400 text-sm">
              No notification rules configured
            </div>
          )}

          {/* Log */}
          <h2 className="text-sm font-medium text-stone-400 mt-6">Recent Notifications</h2>
          <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
            {logEntries.slice(0, 20).map(entry => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                {entry.success ? (
                  <CheckCircle size={14} className="text-success shrink-0" />
                ) : (
                  <XCircle size={14} className="text-danger shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-600 truncate">{entry.message}</p>
                  <p className="text-xs text-stone-400">{entry.sent_at ? new Date(entry.sent_at).toLocaleString() : ''}</p>
                </div>
                {!entry.success && entry.error_message && (
                  <span className="text-xs text-danger">{entry.error_message}</span>
                )}
              </div>
            ))}
            {logEntries.length === 0 && (
              <div className="px-4 py-8 text-center text-stone-400 text-sm">No notifications sent yet</div>
            )}
          </div>
        </div>

        <CreateRuleForm onSubmit={(rule) => createRule.mutate(rule)} />
      </div>
    </div>
  )
}
