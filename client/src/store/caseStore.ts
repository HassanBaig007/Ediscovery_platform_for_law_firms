import { create } from 'zustand';
import { ICase } from '../../../shared/types';
import api from '../services/api';

interface CaseState {
    cases: ICase[];
    currentCase: ICase | null;
    isLoading: boolean;
    error: string | null;
    page: number;
    pages: number;
    total: number;
    statusCounts: {
        total: number;
        active: number;
        closed: number;
        archived: number;
    };
    filter: {
        status: string;
        search: string;
        sortBy: 'caseNumber' | 'caseName' | 'clientName' | 'createdAt';
        sortOrder: 'asc' | 'desc';
    };
    selectedCases: string[];

    fetchCases: (
        status?: string,
        page?: number,
        limit?: number,
        search?: string,
        sortBy?: 'caseName' | 'clientName' | 'status' | 'createdAt',
        sortOrder?: 'asc' | 'desc'
    ) => Promise<void>;
    fetchCaseById: (id: string) => Promise<void>;
    createCase: (data: Partial<ICase>) => Promise<void>;
    updateCase: (id: string, data: Partial<ICase>) => Promise<void>;
    deleteCase: (id: string) => Promise<void>;
    addTeamMember: (caseId: string, userId: string, role: string) => Promise<void>;
    removeTeamMember: (caseId: string, userId: string) => Promise<void>;
    setCurrentCase: (caseItem: ICase | null) => void;
    setFilter: (filter: Partial<CaseState['filter']>) => void;
    clearFilter: () => void;
    toggleCaseSelection: (caseId: string) => void;
    clearCaseSelection: () => void;
}

export const useCaseStore = create<CaseState>((set, get) => ({
    cases: [],
    currentCase: null,
    isLoading: false,
    error: null,
    page: 1,
    pages: 1,
    total: 0,
    statusCounts: {
        total: 0,
        active: 0,
        closed: 0,
        archived: 0,
    },
    filter: {
        status: 'All',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
    },
    selectedCases: [],

    fetchCases: async (status = 'All', page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc') => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/cases', { params: { status, page, limit, search, sortBy, sortOrder } });
            const casesData = response.data.cases || response.data;
            set({
                cases: casesData,
                page: response.data.page || page,
                pages: response.data.pages || 1,
                total: response.data.total || 0,
                statusCounts: response.data.statusCounts || {
                    total: casesData.length,
                    active: casesData.filter((c: ICase) => c.status === 'ACTIVE').length,
                    closed: casesData.filter((c: ICase) => c.status === 'CLOSED').length,
                    archived: casesData.filter((c: ICase) => c.status === 'ARCHIVED').length,
                },
                isLoading: false
            });
        } catch (err: any) {
            console.error('API failed to fetch cases:', err);
            set({ 
                isLoading: false, 
                error: err.response?.data?.message || 'Failed to fetch cases',
                cases: [],
                total: 0,
                page: 1,
                pages: 1,
                statusCounts: {
                    total: 0,
                    active: 0,
                    closed: 0,
                    archived: 0,
                }
            });
        }
    },

    fetchCaseById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get(`/cases/${id}`);
            set({ currentCase: response.data, isLoading: false });
        } catch (err: any) {
            console.error(`API failed to fetch case ${id}:`, err);
            set({ error: err.response?.data?.message || 'Case not found', isLoading: false, currentCase: null });
        }
    },

    createCase: async (data: Partial<ICase>) => {
        set({ isLoading: true, error: null });
        try {
            await api.post('/cases', data);
            await get().fetchCases();
            set({ isLoading: false });
        } catch (err: any) {
            console.error('API failed to create case:', err);
            set({ 
                isLoading: false,
                error: err.response?.data?.message || 'Failed to create case'
            });
        }
    },

    updateCase: async (id: string, data: Partial<ICase>) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.put(`/cases/${id}`, data);
            set({ currentCase: response.data, isLoading: false });
            const cases = get().cases.map(c => c.id === id ? response.data : c);
            set({ cases });
        } catch (err: any) {
            console.error(`API failed to update case ${id}:`, err);
            set({ 
                isLoading: false,
                error: err.response?.data?.message || 'Failed to update case'
            });
        }
    },

    deleteCase: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            await api.delete(`/cases/${id}`);
            set((state) => ({
                cases: state.cases.filter(c => c.id !== id),
                isLoading: false
            }));
        } catch (err: any) {
            console.error(`API failed to delete case ${id}:`, err);
            set({ 
                isLoading: false,
                error: err.response?.data?.message || 'Failed to delete case'
            });
            throw err;
        }
    },

    addTeamMember: async (caseId: string, userId: string, role: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post(`/cases/${caseId}/team`, { userId, role });
            set({ currentCase: response.data, isLoading: false });
        } catch (err: any) {
            console.error('Failed to add team member:', err);
            set({ error: err.response?.data?.message || 'Failed to add team member', isLoading: false });
        }
    },

    removeTeamMember: async (caseId: string, userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.delete(`/cases/${caseId}/team/${userId}`);
            set({ currentCase: response.data, isLoading: false });
        } catch (err: any) {
            console.error('Failed to remove team member:', err);
            set({ error: err.response?.data?.message || 'Failed to remove team member', isLoading: false });
        }
    },

    setCurrentCase: (caseItem) => set({ currentCase: caseItem }),
    setFilter: (filter) => set(state => ({ filter: { ...state.filter, ...filter } })),
    clearFilter: () => set({ filter: { status: 'All', search: '', sortBy: 'createdAt', sortOrder: 'desc' } }),
    toggleCaseSelection: (caseId) => set(state => ({
        selectedCases: state.selectedCases.includes(caseId)
            ? state.selectedCases.filter(id => id !== caseId)
            : [...state.selectedCases, caseId]
    })),
    clearCaseSelection: () => set({ selectedCases: [] }),
}));
