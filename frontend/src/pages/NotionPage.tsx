import { useState } from 'react'
import { Plus, Trash2, Save, Tag } from 'lucide-react'
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../hooks/useNotes'
import type { Note } from '../types'

function NoteEditor({ note, onSave, onCancel }: {
  note?: Note; onSave: (data: { title: string; content: string; tags: string[] }) => void; onCancel: () => void
}) {
  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [tagsStr, setTagsStr] = useState(note?.tags.join(', ') || '')

  return (
    <div className="bg-surface-1 rounded-xl border border-white/5 p-5 space-y-3">
      <input
        className="w-full bg-transparent text-lg font-medium text-white placeholder-gray-500 focus:outline-none"
        placeholder="Note title..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent/50 min-h-[300px] resize-y"
        placeholder="Write your note..."
        value={content}
        onChange={e => setContent(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Tag size={14} className="text-gray-500" />
        <input
          className="flex-1 bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
          placeholder="Tags (comma separated)"
          value={tagsStr}
          onChange={e => setTagsStr(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button onClick={() => {
          if (!title.trim()) return
          onSave({ title, content, tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean) })
        }} className="flex items-center gap-2 bg-accent hover:bg-accent-dim text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
          <Save size={14} /> Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 rounded-lg hover:bg-white/5">
          Cancel
        </button>
      </div>
    </div>
  )
}

function NoteCard({ note, onClick, onDelete }: { note: Note; onClick: () => void; onDelete: () => void }) {
  return (
    <div onClick={onClick}
      className="bg-surface-1 rounded-xl border border-white/5 p-4 cursor-pointer hover:border-accent/20 transition-colors group">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-medium text-gray-200 truncate">{note.title}</h3>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/5 text-gray-500 hover:text-danger transition-all">
          <Trash2 size={14} />
        </button>
      </div>
      {note.content && (
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-3">{note.content}</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        {note.tags.map(tag => (
          <span key={tag} className="px-1.5 py-0.5 bg-accent/10 text-accent text-xs rounded">{tag}</span>
        ))}
        <span className="ml-auto text-xs text-gray-600">
          {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : ''}
        </span>
      </div>
    </div>
  )
}

export default function NotionPage() {
  const { data } = useNotes()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const [editing, setEditing] = useState<Note | null>(null)
  const [creating, setCreating] = useState(false)

  const notes = data?.notes || []

  if (creating) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-white">New Note</h1>
        <NoteEditor
          onSave={(data) => { createNote.mutate(data); setCreating(false) }}
          onCancel={() => setCreating(false)}
        />
      </div>
    )
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-white">Edit Note</h1>
        <NoteEditor
          note={editing}
          onSave={(data) => { updateNote.mutate({ id: editing.id!, ...data }); setEditing(null) }}
          onCancel={() => setEditing(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Notes</h1>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-dim text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
          <Plus size={14} /> New Note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            onClick={() => setEditing(note)}
            onDelete={() => note.id && deleteNote.mutate(note.id)}
          />
        ))}
      </div>

      {notes.length === 0 && (
        <div className="bg-surface-1 rounded-xl border border-white/5 flex flex-col items-center justify-center h-48 text-gray-500 text-sm">
          <p>No notes yet</p>
          <button onClick={() => setCreating(true)} className="mt-2 text-accent hover:underline text-sm">Create your first note</button>
        </div>
      )}
    </div>
  )
}
