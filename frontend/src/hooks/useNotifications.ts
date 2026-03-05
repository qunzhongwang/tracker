import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { NotificationRule, NotificationLogEntry } from '../types'

export function useNotificationRules() {
  return useQuery({
    queryKey: ['notifications', 'rules'],
    queryFn: () => api.get<{ rules: NotificationRule[] }>('/notifications/rules'),
    refetchInterval: false,
  })
}

export function useCreateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rule: NotificationRule) => api.post<NotificationRule>('/notifications/rules', rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useUpdateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...rule }: NotificationRule & { id: number }) =>
      api.put<NotificationRule>(`/notifications/rules/${id}`, rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useDeleteRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.del(`/notifications/rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useNotificationLog() {
  return useQuery({
    queryKey: ['notifications', 'log'],
    queryFn: () => api.get<{ entries: NotificationLogEntry[]; total: number }>('/notifications/log'),
  })
}
