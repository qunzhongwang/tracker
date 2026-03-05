import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { ClusterSummary, ResourceSnapshot } from '../types'

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: () => api.get<ClusterSummary>('/resources'),
  })
}

export function useResourceHistory(hours = 24) {
  return useQuery({
    queryKey: ['resources', 'history', hours],
    queryFn: () => api.get<ResourceSnapshot[]>(`/resources/history?hours=${hours}`),
    refetchInterval: 60000,
  })
}
