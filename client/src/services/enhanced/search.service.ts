import api from '../api';

export interface AdvancedSearchFilters {
  caseId: string;
  text?: string;
  dateFrom?: string;
  dateTo?: string;
  fileTypes?: string[];
  custodianIds?: string[];
  privilegeStatuses?: string[];
  relevanceStatuses?: string[];
  issueTagIds?: string[];
}

export const searchService = {
  advanced: (filters: AdvancedSearchFilters, page = 1, pageSize = 25) =>
    api.post('/search', { ...filters, page, pageSize }),

  suggest: (query: string) =>
    api.get('/search/suggest', { params: { q: query } }),
};
