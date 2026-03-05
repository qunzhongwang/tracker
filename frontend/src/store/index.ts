import { create } from 'zustand'

interface AppState {
  activeTerminalId: string | null
  setActiveTerminal: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTerminalId: null,
  setActiveTerminal: (id) => set({ activeTerminalId: id }),
}))
