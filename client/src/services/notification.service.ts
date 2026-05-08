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

interface ApiNotification extends Omit<Notification, 'id'> {
  _id?: string;
  id?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  page: number;
  pages: number;
  total: number;
  unreadCount: number;
}

const normalizeNotification = (notification: ApiNotification): Notification => ({
  ...notification,
  id: notification.id ?? notification._id ?? ''
});

const normalizeListResponse = (data: {
  notifications?: ApiNotification[];
  page?: number;
  pages?: number;
  total?: number;
  unreadCount?: number;
}): NotificationsResponse => ({
  notifications: (data.notifications ?? []).map(normalizeNotification).filter((item) => item.id),
  page: data.page ?? 1,
  pages: data.pages ?? 1,
  total: data.total ?? 0,
  unreadCount: data.unreadCount ?? 0
});

export const notificationService = {
  getAll: async (page = 1, limit = 20, unreadOnly = false): Promise<NotificationsResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      unreadOnly: unreadOnly.toString()
    });
    const response = await api.get(`/notifications?${params}`);
    return normalizeListResponse(response.data);
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.patch(`/notifications/${id}/read`);
    return normalizeNotification(response.data as ApiNotification);
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
