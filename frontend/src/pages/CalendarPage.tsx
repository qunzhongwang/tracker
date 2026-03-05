import { useState } from 'react'
import { Plus, Trash2, Clock, MapPin } from 'lucide-react'
import { useCalendarEvents, useCreateCalendarEvent, useDeleteCalendarEvent } from '../hooks/useCalendar'
import type { CalendarEvent } from '../types'

function EventCard({ event, onDelete }: { event: CalendarEvent; onDelete: () => void }) {
  const start = new Date(event.start)
  const end = new Date(event.end)
  const isToday = new Date().toDateString() === start.toDateString()

  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      isToday ? 'bg-accent/5 border-accent/20' : 'bg-white border-stone-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-stone-700 truncate">{event.summary}</h4>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {event.all_day ? 'All day' : (
                `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              )}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {event.location}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-stone-400 mt-1.5 line-clamp-2">{event.description}</p>
          )}
        </div>
        <button onClick={onDelete} className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-danger shrink-0">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function CreateEventForm({ onSubmit }: { onSubmit: (e: Partial<CalendarEvent>) => void }) {
  const [form, setForm] = useState({ summary: '', start: '', end: '', description: '', location: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.summary || !form.start || !form.end) return
    onSubmit(form)
    setForm({ summary: '', start: '', end: '', description: '', location: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 p-5 space-y-3">
      <h3 className="text-sm font-medium text-stone-500">New Event</h3>
      <input className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
        placeholder="Event title" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Start</label>
          <input type="datetime-local" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-stone-500 mb-1 block">End</label>
          <input type="datetime-local" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
        </div>
      </div>
      <input className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
        placeholder="Location (optional)" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
      <button type="submit" className="flex items-center gap-2 bg-accent hover:bg-accent-dim text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
        <Plus size={14} /> Create Event
      </button>
    </form>
  )
}

export default function CalendarPage() {
  const { data } = useCalendarEvents()
  const createEvent = useCreateCalendarEvent()
  const deleteEvent = useDeleteCalendarEvent()

  const events = data?.events || []

  // Group events by date
  const grouped: Record<string, CalendarEvent[]> = {}
  events.forEach(e => {
    const date = new Date(e.start).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(e)
  })

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-stone-900">Calendar</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(grouped).length > 0 ? (
            Object.entries(grouped).map(([date, dayEvents]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-stone-400 mb-2">{date}</h3>
                <div className="space-y-2">
                  {dayEvents.map(e => (
                    <EventCard key={e.id} event={e} onDelete={() => deleteEvent.mutate(e.id)} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg border border-stone-200 flex items-center justify-center h-48 text-stone-400 text-sm">
              No upcoming events. Create one to get started.
            </div>
          )}
        </div>
        <CreateEventForm onSubmit={(e) => createEvent.mutate(e)} />
      </div>
    </div>
  )
}
