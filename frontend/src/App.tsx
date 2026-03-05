import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Server, Terminal, FileText, Activity,
  Calendar, StickyNote, Bell, Settings
} from 'lucide-react'
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface-0">
        <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center h-14">
              <span className="text-base font-semibold text-stone-800 tracking-tight mr-8">
                HPC Tracker
              </span>
              <nav className="flex items-center gap-0.5">
                {navItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) => clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
                    )}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
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
        </main>
      </div>
    </BrowserRouter>
  )
}
