import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { CalendarEvent } from '../types'

export function useCalendarEvents(timeMin?: string, timeMax?: string) {
  const params = new URLSearchParams()
  if (timeMin) params.set('time_min', timeMin)
  if (timeMax) params.set('time_max', timeMax)
  return useQuery({
    queryKey: ['calendar', timeMin, timeMax],
    queryFn: () => api.get<{ events: CalendarEvent[] }>(`/calendar?${params}`),
    refetchInterval: 60000,
  })
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (event: Partial<CalendarEvent>) => api.post<CalendarEvent>('/calendar', event),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  })
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/calendar/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  })
}
