import { create } from 'zustand'

interface AppState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  activeTerminalId: string | null
  setActiveTerminal: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  activeTerminalId: null,
  setActiveTerminal: (id) => set({ activeTerminalId: id }),
}))
