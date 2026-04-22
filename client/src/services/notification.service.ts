import api from './api';

export interface Notification {
  id: string;
  type: 'DOCUMENT' | 'CASE' | 'REVIEW' | 'SYSTEM' | 'USER';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationsResponse {
  notifications: Notification[];
  page: number;
  pages: number;
  total: number;
  unreadCount: number;
}

export const notificationService = {
  getAll: async (page = 1, limit = 20, unreadOnly = false): Promise<NotificationsResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      unreadOnly: unreadOnly.toString()
    });
    const response = await api.get(`/notifications?${params}`);
    return response.data;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },

  deleteBatch: async (ids: string[]): Promise<void> => {
    await api.post('/notifications/delete-batch', { ids });
  }
};
