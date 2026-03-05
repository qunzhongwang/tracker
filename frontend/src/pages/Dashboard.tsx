import { Server, Cpu, Activity, HardDrive, Terminal, FileText } from 'lucide-react'
import { useJobs } from '../hooks/useJobs'
import { useResources } from '../hooks/useResources'
import type { Job } from '../types'

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Server; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm text-stone-500">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-stone-900">{value}</div>
      {sub && <div className="text-xs text-stone-400 mt-1">{sub}</div>}
    </div>
  )
}

function stateColor(state: string): string {
  const s = state.toUpperCase()
  if (s === 'RUNNING') return 'text-success'
  if (s === 'PENDING') return 'text-warning'
  if (s === 'COMPLETED') return 'text-info'
  if (s.includes('FAIL') || s.includes('CANCEL')) return 'text-danger'
  return 'text-stone-400'
}

function MiniJobTable({ jobs }: { jobs: Job[] }) {
  const recent = jobs.slice(0, 8)
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-5">
      <h3 className="text-sm font-medium text-stone-500 mb-3">Recent Jobs</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-stone-400 text-xs border-b border-stone-200">
              <th className="text-left pb-2 font-medium">ID</th>
              <th className="text-left pb-2 font-medium">Name</th>
              <th className="text-left pb-2 font-medium">State</th>
              <th className="text-left pb-2 font-medium">Partition</th>
              <th className="text-right pb-2 font-medium">GPUs</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((j) => (
              <tr key={j.job_id} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="py-2 font-mono text-stone-600">{j.job_id}</td>
                <td className="py-2 text-stone-600 max-w-[200px] truncate">{j.job_name || '-'}</td>
                <td className={`py-2 font-medium ${stateColor(j.state)}`}>{j.state}</td>
                <td className="py-2 text-stone-500">{j.partition_name}</td>
                <td className="py-2 text-right text-stone-500">{j.num_gpus || '-'}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-stone-400">No jobs found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: jobData } = useJobs('live')
  const { data: resources } = useResources()

  const jobs = jobData?.jobs || []
  const running = jobs.filter(j => j.state.toUpperCase() === 'RUNNING').length
  const pending = jobs.filter(j => j.state.toUpperCase() === 'PENDING').length

  const cpuUtil = resources
    ? `${resources.total_cpus > 0 ? Math.round((resources.allocated_cpus / resources.total_cpus) * 100) : 0}%`
    : '-'
  const gpuUtil = resources
    ? `${resources.total_gpus > 0 ? Math.round((resources.allocated_gpus / resources.total_gpus) * 100) : 0}%`
    : '-'

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-stone-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          label="Running Jobs"
          value={running}
          sub={`${pending} pending`}
          color="bg-success/10 text-success"
        />
        <StatCard
          icon={Cpu}
          label="CPU Usage"
          value={cpuUtil}
          sub={resources ? `${resources.allocated_cpus} / ${resources.total_cpus}` : ''}
          color="bg-info/10 text-info"
        />
        <StatCard
          icon={HardDrive}
          label="GPU Usage"
          value={gpuUtil}
          sub={resources ? `${resources.allocated_gpus} / ${resources.total_gpus}` : ''}
          color="bg-accent/10 text-accent"
        />
        <StatCard
          icon={Activity}
          label="Cluster Nodes"
          value={resources?.available_nodes ?? '-'}
          sub={resources ? `${resources.total_nodes} total` : ''}
          color="bg-warning/10 text-warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MiniJobTable jobs={jobs} />
        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h3 className="text-sm font-medium text-stone-500 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="/jobs" className="flex items-center gap-2 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors text-sm text-stone-600">
              <Server size={16} className="text-accent" /> Manage Jobs
            </a>
            <a href="/terminal" className="flex items-center gap-2 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors text-sm text-stone-600">
              <Terminal size={16} className="text-success" /> Open Terminal
            </a>
            <a href="/logs" className="flex items-center gap-2 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors text-sm text-stone-600">
              <FileText size={16} className="text-warning" /> View Logs
            </a>
            <a href="/resources" className="flex items-center gap-2 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors text-sm text-stone-600">
              <Cpu size={16} className="text-info" /> Resources
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
