import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = crypto.randomUUID();
    const duration = toast.duration || (toast.type === 'error' ? 5000 : 3000);
    
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, duration }],
    }));

    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  
  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// Helper functions for common toast types
export const toast = {
  success: (title: string, message?: string) => {
    useToastStore.getState().addToast({ type: 'success', title, message });
  },
  error: (title: string, message?: string) => {
    useToastStore.getState().addToast({ type: 'error', title, message });
  },
  warning: (title: string, message?: string) => {
    useToastStore.getState().addToast({ type: 'warning', title, message });
  },
  info: (title: string, message?: string) => {
    useToastStore.getState().addToast({ type: 'info', title, message });
  },
  operationSuccess: (entityLabel: string, actionPastTense = 'updated', message?: string) => {
    const title = `${entityLabel} ${actionPastTense}`;
    useToastStore.getState().addToast({
      type: 'success',
      title,
      message: message ?? `${entityLabel} was ${actionPastTense.toLowerCase()} successfully.`
    });
  },
  operationError: (entityLabel: string, actionVerb = 'update', message?: string) => {
    const title = `${entityLabel} ${actionVerb} failed`;
    useToastStore.getState().addToast({
      type: 'error',
      title,
      message: message ?? `Unable to ${actionVerb.toLowerCase()} ${entityLabel.toLowerCase()}. Please try again.`
    });
  }
};
