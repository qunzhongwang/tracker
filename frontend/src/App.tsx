import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Server, Terminal, FileText, Activity,
  Calendar, StickyNote, Bell, Settings, Menu, X, ChevronLeft
} from 'lucide-react'
import { useAppStore } from './store'
import Dashboard from './pages/Dashboard'
import JobsPage from './pages/JobsPage'
import LogsPage from './pages/LogsPage'
import ResourcesPage from './pages/ResourcesPage'
import TerminalPage from './pages/TerminalPage'
import CalendarPage from './pages/CalendarPage'
import NotionPage from './pages/NotionPage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs', icon: Server, label: 'Jobs' },
  { to: '/terminal', icon: Terminal, label: 'Terminal' },
  { to: '/logs', icon: FileText, label: 'Logs' },
  { to: '/resources', icon: Activity, label: 'Resources' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
  { to: '/notifications', icon: Bell, label: 'Alerts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore()

  return (
    <aside className={clsx(
      'fixed left-0 top-0 h-full bg-surface-1 border-r border-white/5 z-30 transition-all duration-200 flex flex-col',
      sidebarOpen ? 'w-52' : 'w-14'
    )}>
      <div className="flex items-center h-14 px-3 border-b border-white/5">
        {sidebarOpen && (
          <span className="text-accent font-bold text-lg tracking-tight mr-auto">HPC Tracker</span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white ml-auto"
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-2 space-y-0.5 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-accent/15 text-accent-light font-medium'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            )}
          >
            <Icon size={18} className="shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-white/5 text-xs text-gray-500">
        {sidebarOpen && 'v0.1.0'}
      </div>
    </aside>
  )
}

export default function App() {
  const { sidebarOpen } = useAppStore()

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Sidebar />
        <main className={clsx(
          'transition-all duration-200 min-h-screen',
          sidebarOpen ? 'ml-52' : 'ml-14'
        )}>
          <div className="p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/terminal" element={<TerminalPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/notes" element={<NotionPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}
