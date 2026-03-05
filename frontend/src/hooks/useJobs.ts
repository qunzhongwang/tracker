import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { JobListResponse, JobSubmitRequest, CommandPreset } from '../types'

export function useJobs(source = 'live', state?: string) {
  const params = new URLSearchParams({ source })
  if (state) params.set('state', state)
  return useQuery({
    queryKey: ['jobs', source, state],
    queryFn: () => api.get<JobListResponse>(`/jobs?${params}`),
  })
}

export function useJobHistory() {
  return useQuery({
    queryKey: ['jobs', 'history'],
    queryFn: () => api.get<JobListResponse>('/jobs?source=history'),
    refetchInterval: 60000,
  })
}

export function useSubmitJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: JobSubmitRequest) => api.post<{ job_id: string; message: string }>('/jobs/submit', req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

export function useCancelJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) => api.post<{ job_id: string; message: string }>(`/jobs/${jobId}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

export function usePresets() {
  return useQuery({
    queryKey: ['presets'],
    queryFn: () => api.get<CommandPreset[]>('/config/presets'),
    refetchInterval: false,
  })
}

export function useCreatePreset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (preset: CommandPreset) => api.post<CommandPreset>('/config/presets', preset),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presets'] }),
  })
}

export function useDeletePreset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.del(`/config/presets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presets'] }),
  })
}
