import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { TerminalSession } from '../types'

export function useTerminals() {
  return useQuery({
    queryKey: ['terminals'],
    queryFn: () => api.get<{ terminals: TerminalSession[] }>('/terminal'),
    refetchInterval: false,
  })
}

export function useCreateTerminal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (opts?: { title?: string; cols?: number; rows?: number }) =>
      api.post<TerminalSession>('/terminal', opts || {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['terminals'] }),
  })
}

export function useDestroyTerminal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/terminal/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['terminals'] }),
  })
}
