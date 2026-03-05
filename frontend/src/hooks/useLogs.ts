import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { FileEntry, LogContent } from '../types'

export function useLogRoots() {
  return useQuery({
    queryKey: ['logs', 'roots'],
    queryFn: () => api.get<FileEntry[]>('/logs/roots'),
    refetchInterval: false,
  })
}

export function useBrowseDir(path: string) {
  return useQuery({
    queryKey: ['logs', 'browse', path],
    queryFn: () => api.get<FileEntry[]>(`/logs/browse?path=${encodeURIComponent(path)}`),
    enabled: !!path,
    refetchInterval: false,
  })
}

export function useLogContent(path: string, offset = 0, limit = 1000) {
  return useQuery({
    queryKey: ['logs', 'read', path, offset],
    queryFn: () => api.get<LogContent>(`/logs/read?path=${encodeURIComponent(path)}&offset=${offset}&limit=${limit}`),
    enabled: !!path,
    refetchInterval: false,
  })
}

export function useLogTail(path: string, lines = 100) {
  return useQuery({
    queryKey: ['logs', 'tail', path],
    queryFn: () => api.get<{ path: string; content: string }>(`/logs/tail?path=${encodeURIComponent(path)}&lines=${lines}`),
    enabled: !!path,
    refetchInterval: 5000,
  })
}

export function useLogSearch(path: string, query: string) {
  return useQuery({
    queryKey: ['logs', 'search', path, query],
    queryFn: () => api.get<{ results: { line_number: number; line: string }[]; total: number }>(
      `/logs/search?path=${encodeURIComponent(path)}&query=${encodeURIComponent(query)}`
    ),
    enabled: !!path && !!query,
    refetchInterval: false,
  })
}
