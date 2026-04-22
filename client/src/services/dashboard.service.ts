import api from './api';

export interface DashboardStats {
  activeCases: number;
  totalDocuments: number;
  pendingReview: number;
}

export interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
  caseId?: string;
  caseName?: string;
}

export interface CaseOverview {
  _id: string;
  caseName: string;
  status: string;
  totalDocuments: number;
  reviewedDocuments: number;
  progress: number;
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getRecentActivity: async (limit = 10): Promise<ActivityItem[]> => {
    const response = await api.get(`/dashboard/activity?limit=${limit}`);
    return response.data;
  },

  getOverview: async (): Promise<CaseOverview[]> => {
    const response = await api.get('/dashboard/overview');
    return response.data;
  }
};
