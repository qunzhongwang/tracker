import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { useTerminals, useCreateTerminal, useDestroyTerminal } from '../hooks/useTerminal'
import type { TerminalSession } from '../types'

function TerminalView({ session }: { session: TerminalSession }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitRef = useRef<any>(null)

  useEffect(() => {
    let cleanup = false

    async function init() {
      const { Terminal } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      const { WebLinksAddon } = await import('@xterm/addon-web-links')
      await import('@xterm/xterm/css/xterm.css')

      if (cleanup || !containerRef.current) return

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        theme: {
          background: '#0a0e17',
          foreground: '#e5e7eb',
          cursor: '#6366f1',
          selectionBackground: '#6366f140',
          black: '#1a2235',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#e5e7eb',
        },
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.loadAddon(new WebLinksAddon())
      term.open(containerRef.current)
      fitAddon.fit()

      termRef.current = term
      fitRef.current = fitAddon

      // WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal/ws/${session.id}`)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        // Send resize
        const dims = { cols: term.cols, rows: term.rows }
        fetch(`/api/terminal/${session.id}/resize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dims),
        })
      }

      ws.onmessage = (ev) => {
        if (ev.data instanceof ArrayBuffer) {
          term.write(new Uint8Array(ev.data))
        } else {
          term.write(ev.data)
        }
      }

      ws.onclose = () => {
        term.write('\r\n\x1b[31m[Connection closed]\x1b[0m\r\n')
      }

      term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(new TextEncoder().encode(data))
        }
      })

      term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        fetch(`/api/terminal/${session.id}/resize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cols, rows }),
        })
      })
    }

    init()

    const handleResize = () => {
      if (fitRef.current) {
        fitRef.current.fit()
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cleanup = true
      window.removeEventListener('resize', handleResize)
      wsRef.current?.close()
      termRef.current?.dispose()
    }
  }, [session.id])

  return <div ref={containerRef} className="w-full h-full min-h-[400px]" />
}

export default function TerminalPage() {
  const { data } = useTerminals()
  const createTerminal = useCreateTerminal()
  const destroyTerminal = useDestroyTerminal()
  const [activeId, setActiveId] = useState<string | null>(null)

  const terminals = data?.terminals || []

  useEffect(() => {
    if (!activeId && terminals.length > 0) {
      setActiveId(terminals[0].id)
    }
  }, [terminals, activeId])

  const handleCreate = useCallback(async () => {
    const result = await createTerminal.mutateAsync({ title: `Terminal ${terminals.length + 1}` })
    setActiveId(result.id)
  }, [createTerminal, terminals.length])

  const handleClose = useCallback(async (id: string) => {
    await destroyTerminal.mutateAsync(id)
    if (activeId === id) {
      const remaining = terminals.filter(t => t.id !== id)
      setActiveId(remaining.length > 0 ? remaining[0].id : null)
    }
  }, [destroyTerminal, activeId, terminals])

  const activeSession = terminals.find(t => t.id === activeId)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Terminal</h1>

      <div className="bg-surface-1 rounded-xl border border-white/5 overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center bg-surface-2 border-b border-white/5 px-2">
          {terminals.map(t => (
            <div
              key={t.id}
              className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer border-b-2 transition-colors ${
                activeId === t.id ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setActiveId(t.id)}
            >
              <span>{t.title}</span>
              <button onClick={(e) => { e.stopPropagation(); handleClose(t.id) }}
                className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-danger">
                <X size={12} />
              </button>
            </div>
          ))}
          <button onClick={handleCreate}
            className="p-1.5 ml-1 rounded hover:bg-white/5 text-gray-400 hover:text-white">
            <Plus size={14} />
          </button>
        </div>

        {/* Terminal area */}
        <div className="h-[calc(100vh-220px)] bg-surface-0">
          {activeSession ? (
            <TerminalView key={activeSession.id} session={activeSession} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <button onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors">
                <Plus size={16} /> New Terminal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
