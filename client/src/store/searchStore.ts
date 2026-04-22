import { create } from 'zustand';
import api from '../services/api';
import { IDocument, ISavedSearch, ISearchFilters } from '../../../shared/types';

interface SearchState {
    filters: ISearchFilters;
    results: IDocument[];
    savedSearches: ISavedSearch[];
    isLoading: boolean;
    error: string | null;
    total: number;
    page: number;
    pages: number;

    setFilters: (filters: Partial<ISearchFilters>) => void;
    clearFilters: () => void;

    searchDocuments: (caseId: string, page?: number) => Promise<void>;
    saveCurrentSearch: (caseId: string, name: string) => Promise<void>;
    loadSavedSearches: (caseId: string) => Promise<void>;
    deleteSavedSearch: (id: string) => Promise<void>;
    exportResults: (caseId: string) => Promise<void>;
}

const initialFilters: ISearchFilters = {
    caseId: '',
    custodianIds: [],
    privilegeStatuses: [],
    relevanceStatuses: [],
    issueTagIds: [],
    hasNotes: false,
    isDuplicate: false,
    filenameQuery: ''
};

export const useSearchStore = create<SearchState>((set, get) => ({
    filters: initialFilters,
    results: [],
    savedSearches: [],
    isLoading: false,
    error: null,
    total: 0,
    page: 1,
    pages: 1,

    setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
    })),

    clearFilters: () => set({ filters: initialFilters, results: [], total: 0, page: 1 }),

    searchDocuments: async (caseId: string, page = 1) => {
        set({ isLoading: true, error: null });
        try {
            const { filters } = get();

            // Ensure caseId is set in filters
            const searchFilters = { ...filters, caseId };

            const res = await api.post(`/documents/search?page=${page}`, searchFilters);

            set({
                results: res.data.documents,
                total: res.data.total,
                page: res.data.page,
                pages: res.data.pages,
                isLoading: false
            });
        } catch (error: any) {
            set({
                error: error.response?.data?.message || 'Search failed',
                isLoading: false
            });
        }
    },

    saveCurrentSearch: async (caseId: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
            const { filters } = get();
            const searchFilters = { ...filters, caseId };

            await api.post(`/cases/${caseId}/saved-searches`, {
                searchName: name,
                filters: searchFilters
            });

            // Reload saved searches
            await get().loadSavedSearches(caseId);
            set({ isLoading: false });
        } catch (error: any) {
            set({
                error: error.response?.data?.message || 'Failed to save search',
                isLoading: false
            });
            throw error;
        }
    },

    loadSavedSearches: async (caseId: string) => {
        // Don't set global loading here to avoid blocking UI if triggered in background
        try {
            const res = await api.get(`/cases/${caseId}/saved-searches`);
            set({ savedSearches: res.data });
        } catch (error: any) {
            console.error('Failed to load saved searches', error);
        }
    },

    deleteSavedSearch: async (id: string) => {
        try {
            await api.delete(`/saved-searches/${id}`);
            // Remove from local state
            set((state) => ({
                savedSearches: state.savedSearches.filter(s => s.id !== id)
            }));
        } catch (error: any) {
            console.error('Failed to delete search', error);
            set({ error: error.response?.data?.message || 'Failed to delete search' });
        }
    },

    exportResults: async (caseId: string) => {
        // This triggers a download
        const { filters } = get();
        const searchFilters = { ...filters, caseId };

        const parseDownloadFilename = (headerValue?: string) => {
            if (!headerValue) return null;

            const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
            if (utf8Match?.[1]) {
                return decodeURIComponent(utf8Match[1]);
            }

            const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
            if (plainMatch?.[1]) {
                return plainMatch[1];
            }

            return null;
        };

        try {
            const response = await api.post('/documents/export', searchFilters, {
                responseType: 'blob' // Important for file download
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const filenameFromHeader = parseDownloadFilename(response.headers['content-disposition']);
            link.setAttribute('download', filenameFromHeader || `search_export_${new Date().getTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            set({ error: error.response?.data?.message || 'Export failed' });
        }
    }
}));
