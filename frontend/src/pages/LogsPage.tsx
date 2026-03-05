import { useState } from 'react'
import { Folder, FileText, Search, ArrowLeft, RefreshCw } from 'lucide-react'
import { useLogRoots, useBrowseDir, useLogContent, useLogTail, useLogSearch } from '../hooks/useLogs'
import type { FileEntry } from '../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileBrowser({ onSelect }: { onSelect: (path: string) => void }) {
  const [currentPath, setCurrentPath] = useState('')
  const { data: roots } = useLogRoots()
  const { data: entries } = useBrowseDir(currentPath)

  const items = currentPath ? entries : roots

  const goUp = () => {
    const parts = currentPath.split('/')
    parts.pop()
    setCurrentPath(parts.join('/') || '')
  }

  return (
    <div className="bg-surface-1 rounded-xl border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        {currentPath && (
          <button onClick={goUp} className="p-1 rounded hover:bg-white/5 text-gray-400">
            <ArrowLeft size={16} />
          </button>
        )}
        <h3 className="text-sm font-medium text-gray-300 truncate">
          {currentPath || 'Watch Paths'}
        </h3>
      </div>
      <div className="space-y-0.5 max-h-[calc(100vh-300px)] overflow-y-auto">
        {(items || []).map((item: FileEntry) => (
          <button
            key={item.path}
            onClick={() => item.is_dir ? setCurrentPath(item.path) : onSelect(item.path)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-sm transition-colors text-left"
          >
            {item.is_dir ? (
              <Folder size={14} className="text-warning shrink-0" />
            ) : (
              <FileText size={14} className="text-gray-400 shrink-0" />
            )}
            <span className="text-gray-300 truncate flex-1">{item.name}</span>
            {!item.is_dir && (
              <span className="text-gray-500 text-xs shrink-0">{formatSize(item.size)}</span>
            )}
          </button>
        ))}
        {(!items || items.length === 0) && (
          <p className="text-xs text-gray-500 py-4 text-center">
            {currentPath ? 'Empty directory' : 'No watch paths configured'}
          </p>
        )}
      </div>
    </div>
  )
}

function LogViewer({ path, onClose }: { path: string; onClose: () => void }) {
  const [mode, setMode] = useState<'full' | 'tail'>('tail')
  const [searchQuery, setSearchQuery] = useState('')
  const [offset, setOffset] = useState(0)

  const { data: content } = useLogContent(mode === 'full' ? path : '', offset)
  const { data: tailData, refetch: refetchTail } = useLogTail(mode === 'tail' ? path : '', 200)
  const { data: searchData } = useLogSearch(searchQuery ? path : '', searchQuery)

  const displayContent = mode === 'tail' ? tailData?.content : content?.content

  return (
    <div className="bg-surface-1 rounded-xl border border-white/5 flex flex-col h-[calc(100vh-220px)]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
        <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-gray-400">
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm text-gray-300 font-mono truncate flex-1">{path.split('/').pop()}</span>

        <div className="flex items-center gap-1">
          {(['tail', 'full'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setOffset(0) }}
              className={`px-2 py-1 text-xs rounded ${mode === m ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-200'}`}>
              {m === 'tail' ? 'Tail' : 'Full'}
            </button>
          ))}
        </div>

        <button onClick={() => refetchTail()} className="p-1 rounded hover:bg-white/5 text-gray-400">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
        <Search size={14} className="text-gray-500" />
        <input
          className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
          placeholder="Search in file..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchData && <span className="text-xs text-gray-500">{searchData.total} matches</span>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {searchQuery && searchData ? (
          <div className="space-y-1">
            {searchData.results.map((r, i) => (
              <div key={i} className="flex gap-3 text-xs font-mono">
                <span className="text-gray-500 shrink-0 w-12 text-right">{r.line_number}</span>
                <span className="text-gray-300 break-all">{r.line}</span>
              </div>
            ))}
          </div>
        ) : (
          <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all">
            {displayContent || 'Loading...'}
          </pre>
        )}
      </div>

      {/* Pagination for full mode */}
      {mode === 'full' && content && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 text-xs text-gray-500">
          <span>Lines {offset + 1} - {Math.min(offset + content.limit, content.total_lines)} of {content.total_lines}</span>
          <div className="flex gap-2">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 1000))}
              className="px-2 py-1 rounded bg-surface-2 hover:bg-surface-3 disabled:opacity-30">Prev</button>
            <button disabled={offset + 1000 >= content.total_lines} onClick={() => setOffset(offset + 1000)}
              className="px-2 py-1 rounded bg-surface-2 hover:bg-surface-3 disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LogsPage() {
  const [selectedFile, setSelectedFile] = useState('')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Logs</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
          <FileBrowser onSelect={setSelectedFile} />
        </div>
        <div className="lg:col-span-3">
          {selectedFile ? (
            <LogViewer path={selectedFile} onClose={() => setSelectedFile('')} />
          ) : (
            <div className="bg-surface-1 rounded-xl border border-white/5 flex items-center justify-center h-64 text-gray-500 text-sm">
              Select a file to view
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
