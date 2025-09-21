import { create } from 'zustand';

type ShellState = {
  drawerOpen: boolean;
  setDrawer: (open: boolean) => void;
};

export const useShell = create<ShellState>((set) => ({
  drawerOpen: false,
  setDrawer: (open) => set({ drawerOpen: open }),
}));