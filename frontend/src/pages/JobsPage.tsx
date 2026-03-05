import { useState } from 'react'
import { Play, X, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { useJobs, useJobHistory, useSubmitJob, useCancelJob, usePresets, useCreatePreset, useDeletePreset } from '../hooks/useJobs'
import type { Job, JobSubmitRequest, CommandPreset } from '../types'

function stateColor(state: string): string {
  const s = state.toUpperCase()
  if (s === 'RUNNING') return 'bg-success/15 text-success'
  if (s === 'PENDING') return 'bg-warning/15 text-warning'
  if (s === 'COMPLETED') return 'bg-info/15 text-info'
  if (s.includes('FAIL') || s.includes('CANCEL')) return 'bg-danger/15 text-danger'
  return 'bg-gray-500/15 text-gray-400'
}

function StateBadge({ state }: { state: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stateColor(state)}`}>
      {state}
    </span>
  )
}

function JobTable({ jobs, onCancel }: { jobs: Job[]; onCancel: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-white/5">
            <th className="text-left pb-2 px-3 font-medium">Job ID</th>
            <th className="text-left pb-2 px-3 font-medium">Name</th>
            <th className="text-left pb-2 px-3 font-medium">State</th>
            <th className="text-left pb-2 px-3 font-medium">Partition</th>
            <th className="text-right pb-2 px-3 font-medium">Nodes</th>
            <th className="text-right pb-2 px-3 font-medium">CPUs</th>
            <th className="text-right pb-2 px-3 font-medium">GPUs</th>
            <th className="text-left pb-2 px-3 font-medium">Time Limit</th>
            <th className="text-left pb-2 px-3 font-medium">Submit Time</th>
            <th className="text-center pb-2 px-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.job_id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className="py-2.5 px-3 font-mono text-gray-300">{j.job_id}</td>
              <td className="py-2.5 px-3 text-gray-300 max-w-[200px] truncate">{j.job_name || '-'}</td>
              <td className="py-2.5 px-3"><StateBadge state={j.state} /></td>
              <td className="py-2.5 px-3 text-gray-400">{j.partition_name}</td>
              <td className="py-2.5 px-3 text-right text-gray-400">{j.num_nodes}</td>
              <td className="py-2.5 px-3 text-right text-gray-400">{j.num_cpus}</td>
              <td className="py-2.5 px-3 text-right text-gray-400">{j.num_gpus || '-'}</td>
              <td className="py-2.5 px-3 text-gray-400 font-mono text-xs">{j.time_limit || '-'}</td>
              <td className="py-2.5 px-3 text-gray-500 text-xs">{j.submit_time ? new Date(j.submit_time).toLocaleString() : '-'}</td>
              <td className="py-2.5 px-3 text-center">
                {(j.state.toUpperCase() === 'RUNNING' || j.state.toUpperCase() === 'PENDING') && (
                  <button
                    onClick={() => onCancel(j.job_id)}
                    className="p-1 rounded hover:bg-danger/20 text-gray-400 hover:text-danger transition-colors"
                    title="Cancel job"
                  >
                    <X size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {jobs.length === 0 && (
            <tr><td colSpan={10} className="py-12 text-center text-gray-500">No jobs found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function SubmitForm({ onSubmit }: { onSubmit: (req: JobSubmitRequest) => void }) {
  const [form, setForm] = useState<JobSubmitRequest>({
    command: '', partition: '', job_name: '', num_nodes: 1, num_cpus: 1, num_gpus: 0, time_limit: '01:00:00',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="col-span-2 lg:col-span-4">
        <input
          className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent/50"
          placeholder="Command (e.g., python train.py --epochs 100)"
          value={form.command}
          onChange={e => setForm(f => ({ ...f, command: e.target.value }))}
        />
      </div>
      <input className="bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent/50"
        placeholder="Job name" value={form.job_name} onChange={e => setForm(f => ({ ...f, job_name: e.target.value }))} />
      <input className="bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent/50"
        placeholder="Partition" value={form.partition} onChange={e => setForm(f => ({ ...f, partition: e.target.value }))} />
      <div className="flex gap-2">
        <input className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent/50"
          type="number" min={0} placeholder="GPUs" value={form.num_gpus} onChange={e => setForm(f => ({ ...f, num_gpus: parseInt(e.target.value) || 0 }))} />
        <input className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent/50"
          placeholder="Time" value={form.time_limit} onChange={e => setForm(f => ({ ...f, time_limit: e.target.value }))} />
      </div>
      <button type="submit" className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-dim text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
        <Play size={14} /> Submit
      </button>
    </form>
  )
}

function PresetPanel() {
  const { data: presets } = usePresets()
  const createPreset = useCreatePreset()
  const deletePreset = useDeletePreset()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', command: '', description: '', category: 'general' })

  return (
    <div className="bg-surface-1 rounded-xl border border-white/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Command Presets</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="p-1 rounded hover:bg-white/5 text-gray-400">
          <Plus size={16} />
        </button>
      </div>
      {showAdd && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input className="bg-surface-2 border border-white/5 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500" placeholder="Name" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="bg-surface-2 border border-white/5 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500" placeholder="Category" value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <input className="col-span-2 bg-surface-2 border border-white/5 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500" placeholder="Command" value={form.command}
            onChange={e => setForm(f => ({ ...f, command: e.target.value }))} />
          <button onClick={() => { createPreset.mutate(form as CommandPreset); setShowAdd(false); setForm({ name: '', command: '', description: '', category: 'general' }) }}
            className="col-span-2 bg-accent/20 text-accent text-xs rounded py-1 hover:bg-accent/30">Save Preset</button>
        </div>
      )}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {(presets || []).map((p) => (
          <div key={p.id} className="flex items-center justify-between p-2 rounded bg-surface-2 text-xs">
            <div>
              <span className="text-gray-300 font-medium">{p.name}</span>
              <span className="text-gray-500 ml-2 font-mono">{p.command.slice(0, 60)}</span>
            </div>
            <button onClick={() => p.id && deletePreset.mutate(p.id)} className="text-gray-500 hover:text-danger"><Trash2 size={12} /></button>
          </div>
        ))}
        {(!presets || presets.length === 0) && <p className="text-xs text-gray-500">No presets yet</p>}
      </div>
    </div>
  )
}

export default function JobsPage() {
  const [tab, setTab] = useState<'live' | 'history'>('live')
  const { data: liveData, refetch } = useJobs('live')
  const { data: histData } = useJobHistory()
  const submitJob = useSubmitJob()
  const cancelJob = useCancelJob()

  const jobs = tab === 'live' ? (liveData?.jobs || []) : (histData?.jobs || [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Jobs</h1>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="bg-surface-1 rounded-xl border border-white/5 p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Submit Job</h3>
        <SubmitForm onSubmit={(req) => submitJob.mutate(req)} />
        {submitJob.isError && <p className="text-danger text-xs mt-2">{(submitJob.error as Error).message}</p>}
        {submitJob.isSuccess && <p className="text-success text-xs mt-2">Submitted: {submitJob.data?.job_id}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-surface-1 rounded-xl border border-white/5">
            <div className="flex items-center border-b border-white/5 px-4">
              {(['live', 'history'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === t ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}>
                  {t === 'live' ? 'Queue' : 'History'}
                </button>
              ))}
              <span className="ml-auto text-xs text-gray-500">{jobs.length} jobs</span>
            </div>
            <JobTable jobs={jobs} onCancel={(id) => cancelJob.mutate(id)} />
          </div>
        </div>
        <PresetPanel />
      </div>
    </div>
  )
}
