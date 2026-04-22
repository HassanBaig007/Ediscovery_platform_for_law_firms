import api from './api';

export interface CaseAnalytics {
  caseId: string;
  caseName: string;
  totalDocuments: number;
  reviewedDocuments: number;
  pendingDocuments: number;
  reviewProgress: number;
  relevanceBreakdown: {
    HIGHLY_RELEVANT: number;
    RELEVANT: number;
    NOT_RELEVANT: number;
    MARGINAL: number;
    NEEDS_REVIEW: number;
  };
  privilegeBreakdown: {
    NOT_PRIVILEGED: number;
    ATTORNEY_CLIENT: number;
    WORK_PRODUCT: number;
    NEEDS_REVIEW: number;
  };
}

export interface TeamMemberPerformance {
  userId: string;
  userName: string;
  role: string;
  documentsReviewed: number;
  avgTimePerDoc: number;
}

export interface DailyProgress {
  date: string;
  uploaded: number;
  reviewed: number;
}

export const analyticsService = {
  getCaseAnalytics: async (caseId: string): Promise<CaseAnalytics> => {
    const response = await api.get(`/cases/${caseId}/analytics`);
    return response.data;
  },

  getTeamPerformance: async (caseId: string): Promise<TeamMemberPerformance[]> => {
    const response = await api.get(`/cases/${caseId}/analytics/team`);
    return response.data;
  },

  getDailyProgress: async (caseId: string, days = 30): Promise<DailyProgress[]> => {
    const response = await api.get(`/cases/${caseId}/analytics/progress?days=${days}`);
    return response.data;
  }
};
