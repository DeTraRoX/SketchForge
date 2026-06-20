import { create } from 'zustand';

const DEFAULT_STYLES = {
  stroke: '#1e1e1e',
  fill: 'transparent',
  strokeWidth: 2,
  opacity: 1,
  fontSize: 20,
  fontFamily: 'Virgil, Segoe UI, sans-serif',
  dashed: false,
  rounded: false,
};

export const useCanvasStore = create((set, get) => ({
  tool: 'freehand',
  styles: { ...DEFAULT_STYLES },
  zoom: 1,
  theme: 'light',
  gridStyle: 'dots', // 'dots' | 'gridlines' | 'none'
  showComments: false,
  showVersions: false,
  showActivity: false,

  setTool: (tool) => set({ tool }),
  setStyle: (key, value) => set((s) => ({ styles: { ...s.styles, [key]: value } })),
  setStyles: (partial) => set((s) => ({ styles: { ...s.styles, ...partial } })),
  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.1, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(3, s.zoom * 1.2) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.1, s.zoom / 1.2) })),
  resetZoom: () => set({ zoom: 1 }),
  setTheme: (theme) => set({ theme }),
  setGridStyle: (gridStyle) => set({ gridStyle }),
  toggleGrid: () => set((s) => {
    const nextStyle = s.gridStyle === 'dots' ? 'gridlines' : s.gridStyle === 'gridlines' ? 'none' : 'dots';
    return { gridStyle: nextStyle };
  }),
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  toggleComments: () => set((s) => ({ showComments: !s.showComments })),
  toggleVersions: () => set((s) => ({ showVersions: !s.showVersions })),
  toggleActivity: () => set((s) => ({ showActivity: !s.showActivity })),
  resetStyles: () => set({ styles: { ...DEFAULT_STYLES } }),
}));
