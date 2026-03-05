import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Note } from '../types'

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: () => api.get<{ notes: Note[]; total: number }>('/notes'),
    refetchInterval: false,
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note: { title: string; content?: string; job_id?: string; tags?: string[] }) =>
      api.post<Note>('/notes', note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; title?: string; content?: string; tags?: string[] }) =>
      api.put<Note>(`/notes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.del(`/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}
