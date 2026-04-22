import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
    theme: 'light' | 'dark';
    sidebarCollapsed: boolean;
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

function applyThemeToDOM(theme: 'light' | 'dark') {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            theme: 'light',
            sidebarCollapsed: false,
            toggleTheme: () =>
                set((state) => {
                    const next = state.theme === 'light' ? 'dark' : 'light';
                    applyThemeToDOM(next);
                    return { theme: next };
                }),
            setTheme: (theme) => {
                applyThemeToDOM(theme);
                set({ theme });
            },
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
        }),
        {
            name: 'ui-storage',
            onRehydrateStorage: () => {
                return (state) => {
                    if (state) {
                        applyThemeToDOM(state.theme);
                    }
                };
            },
        }
    )
);
