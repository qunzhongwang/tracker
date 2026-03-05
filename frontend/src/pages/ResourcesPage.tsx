import { useState } from 'react'
import { useResources, useResourceHistory } from '../hooks/useResources'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import type { NodeInfo } from '../types'

function nodeColor(state: string): string {
  const s = state.toLowerCase()
  if (s.includes('idle')) return 'bg-success'
  if (s.includes('mix')) return 'bg-warning'
  if (s.includes('alloc')) return 'bg-danger'
  if (s.includes('down') || s.includes('drain')) return 'bg-stone-300'
  return 'bg-stone-400'
}

function NodeGrid({ nodes }: { nodes: NodeInfo[] }) {
  const [hovered, setHovered] = useState<NodeInfo | null>(null)

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-5">
      <h3 className="text-sm font-medium text-stone-500 mb-3">Node Map</h3>
      <div className="flex gap-3 mb-3 text-xs text-stone-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-success" /> Idle</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-warning" /> Mixed</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-danger" /> Allocated</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-stone-300" /> Down</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {nodes.slice(0, 200).map(n => (
          <div
            key={n.name}
            className={`w-3 h-3 rounded-sm cursor-pointer ${nodeColor(n.state)} opacity-70 hover:opacity-100 transition-opacity`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            title={n.name}
          />
        ))}
      </div>
      {nodes.length > 200 && <p className="text-xs text-stone-400 mt-2">Showing 200 of {nodes.length} nodes</p>}

      {hovered && (
        <div className="mt-3 p-3 bg-stone-50 rounded-lg text-xs border border-stone-100">
          <div className="font-mono text-stone-700 mb-1">{hovered.name}</div>
          <div className="grid grid-cols-3 gap-x-4 text-stone-500">
            <span>State: <span className="text-stone-700">{hovered.state}</span></span>
            <span>CPUs: <span className="text-stone-700">{hovered.cpus_alloc}/{hovered.cpus_total}</span></span>
            <span>GPUs: <span className="text-stone-700">{hovered.gpus_alloc}/{hovered.gpus_total}</span></span>
            <span>Mem: <span className="text-stone-700">{Math.round(hovered.memory_alloc / 1024)}G / {Math.round(hovered.memory_total / 1024)}G</span></span>
            <span className="col-span-2">Partitions: <span className="text-stone-700">{hovered.partitions.join(', ') || '-'}</span></span>
          </div>
        </div>
      )}
    </div>
  )
}

function UsageChart() {
  const [hours, setHours] = useState(24)
  const { data: history } = useResourceHistory(hours)

  const chartData = (history || []).reverse().map(s => ({
    time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cpu: s.total_cpus > 0 ? Math.round((s.allocated_cpus / s.total_cpus) * 100) : 0,
    gpu: s.total_gpus > 0 ? Math.round((s.allocated_gpus / s.total_gpus) * 100) : 0,
    nodes: s.total_nodes > 0 ? Math.round((s.available_nodes / s.total_nodes) * 100) : 0,
  }))

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-stone-500">Usage History</h3>
        <div className="flex gap-1">
          {[6, 12, 24, 48].map(h => (
            <button key={h} onClick={() => setHours(h)}
              className={`px-2 py-1 text-xs rounded transition-colors ${hours === h ? 'bg-accent/10 text-accent' : 'text-stone-400 hover:text-stone-600'}`}>
              {h}h
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="time" tick={{ fill: '#78716c', fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#78716c', fontSize: 11 }} domain={[0, 100]} unit="%" />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            labelStyle={{ color: '#78716c' }}
          />
          <Area type="monotone" dataKey="cpu" stroke="#0369a1" fill="#0369a1" fillOpacity={0.08} name="CPU %" />
          <Area type="monotone" dataKey="gpu" stroke="#b45309" fill="#b45309" fillOpacity={0.08} name="GPU %" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function PartitionTable() {
  const { data: resources } = useResources()
  const partitions = resources?.partitions || []

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-5">
      <h3 className="text-sm font-medium text-stone-500 mb-3">Partitions</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-stone-400 text-xs border-b border-stone-200">
            <th className="text-left pb-2 font-medium">Name</th>
            <th className="text-right pb-2 font-medium">Nodes</th>
            <th className="text-right pb-2 font-medium">Available</th>
            <th className="text-right pb-2 font-medium">CPUs</th>
          </tr>
        </thead>
        <tbody>
          {partitions.map(p => (
            <tr key={p.name} className="border-b border-stone-100">
              <td className="py-2 text-stone-600 font-mono">{p.name}</td>
              <td className="py-2 text-right text-stone-500">{p.total_nodes}</td>
              <td className="py-2 text-right text-success">{p.available_nodes}</td>
              <td className="py-2 text-right text-stone-500">{p.allocated_cpus}/{p.total_cpus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ResourcesPage() {
  const { data: resources } = useResources()

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-stone-900">Resources</h1>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'CPUs', used: resources?.allocated_cpus ?? 0, total: resources?.total_cpus ?? 0, color: 'bg-info' },
          { label: 'GPUs', used: resources?.allocated_gpus ?? 0, total: resources?.total_gpus ?? 0, color: 'bg-accent' },
          { label: 'Nodes', used: (resources?.total_nodes ?? 0) - (resources?.available_nodes ?? 0), total: resources?.total_nodes ?? 0, color: 'bg-warning' },
        ].map(({ label, used, total, color }) => (
          <div key={label} className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-stone-500">{label}</span>
              <span className="text-sm text-stone-700">{used} / {total}</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2">
              <div className={`${color} rounded-full h-2 transition-all`}
                style={{ width: `${total > 0 ? (used / total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UsageChart />
        <PartitionTable />
      </div>

      <NodeGrid nodes={resources?.nodes || []} />
    </div>
  )
}
