import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToastStore } from '../store/toastStore';
import { IDocument, IIssueTag } from '../types';
import { useParams } from 'react-router-dom';

// Types
interface ReviewState {
    currentDocument: IDocument | null;
    queue: string[]; // Future optimization: preload queue
    loading: boolean;
    error: string | null;
    tags: IIssueTag[];
    historyStack: string[]; // IDs of reviewed docs for 'Previous' button
    skippedIds: string[]; // Track skipped document IDs
}

type Action =
    | { type: 'SET_DOCUMENT'; payload: IDocument | null }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string }
    | { type: 'SET_TAGS'; payload: IIssueTag[] }
    | { type: 'PUSH_HISTORY'; payload: string }
    | { type: 'POP_HISTORY' }
    | { type: 'ADD_SKIPPED'; payload: string }
    | { type: 'CLEAR_SKIPPED' };

const initialState: ReviewState = {
    currentDocument: null,
    queue: [],
    loading: true,
    error: null,
    tags: [],
    historyStack: [],
    skippedIds: []
};

const reviewReducer = (state: ReviewState, action: Action): ReviewState => {
    switch (action.type) {
        case 'SET_DOCUMENT':
            return { ...state, currentDocument: action.payload, loading: false, error: null };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        case 'SET_TAGS':
            return { ...state, tags: action.payload };
        case 'PUSH_HISTORY':
            return { ...state, historyStack: [...state.historyStack, action.payload] };
        case 'POP_HISTORY':
            return { ...state, historyStack: state.historyStack.slice(0, -1) };
        case 'ADD_SKIPPED':
            return { ...state, skippedIds: [...state.skippedIds, action.payload] };
        case 'CLEAR_SKIPPED':
            return { ...state, skippedIds: [] };
        default:
            return state;
    }
};

interface ReviewContextType extends ReviewState {
    fetchNextDocument: (skipIds?: string[]) => Promise<void>;
    submitCoding: (data: unknown) => Promise<void>;
    fetchTags: () => Promise<void>;
    goPrevious: () => Promise<void>;
    skipDocument: () => Promise<void>;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reviewReducer, initialState);
    const { id: caseId } = useParams<{ id: string }>();
    const { addToast } = useToastStore();

    const fetchTags = useCallback(async () => {
        if (!caseId) return;
        try {
            const res = await api.get(`/cases/${caseId}/tags`);
            dispatch({ type: 'SET_TAGS', payload: res.data });
        } catch (error) {
            console.error('Failed to fetch tags', error);
        }
    }, [caseId]);

    const fetchNextDocument = useCallback(async (customSkipIds?: string[]) => {
        if (!caseId) return;

        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const activeSkipIds = customSkipIds || state.skippedIds;
            const res = await api.get(`/cases/${caseId}/review/queue`, {
                params: {
                    skipIds: activeSkipIds.join(',')
                }
            });
            dispatch({ type: 'SET_DOCUMENT', payload: res.data });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch document';
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
        }
    }, [caseId, state.skippedIds]);

    const submitCoding = useCallback(async (data: unknown) => {
        if (!state.currentDocument) return;

        try {
            const docId = state.currentDocument.id || (state.currentDocument as any)._id;
            
            // Push current to history before moving
            dispatch({ type: 'PUSH_HISTORY', payload: docId });
            
            const res = await api.post(`/documents/${docId}/code`, data);
            
            // Backend returns nextDocument
            if (res.data.nextDocument) {
                dispatch({ type: 'SET_DOCUMENT', payload: res.data.nextDocument });
            } else {
                // Fetch next if not returned or null (queue empty)
                if (res.data.nextDocument === null) {
                    dispatch({ type: 'SET_DOCUMENT', payload: null }); // Done?
                } else {
                    fetchNextDocument();
                }
            }
            
            // Notify other components to refresh analytics
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('coding-submitted'));
            }
            addToast({ title: 'Coding saved successfully', type: 'success' });
        } catch (error: unknown) {
            console.error('Coding failed', error);
            addToast({ title: 'Failed to save coding', type: 'error' });
        }
    }, [state.currentDocument, fetchNextDocument]);

    const skipDocument = useCallback(async () => {
        if (!state.currentDocument) return;
        const docId = state.currentDocument.id || (state.currentDocument as any)._id;
        
        dispatch({ type: 'ADD_SKIPPED', payload: docId });
        const nextSkipIds = [...state.skippedIds, docId];
        await fetchNextDocument(nextSkipIds);
    }, [state.currentDocument, state.skippedIds, fetchNextDocument]);

    const goPrevious = useCallback(async () => {
        if (state.historyStack.length === 0) return;

        const prevDocId = state.historyStack[state.historyStack.length - 1];
        dispatch({ type: 'POP_HISTORY' }); // Remove from stack
        dispatch({ type: 'SET_LOADING', payload: true });

        try {
            const res = await api.get(`/documents/${prevDocId}`);
            dispatch({ type: 'SET_DOCUMENT', payload: res.data });
        } catch (error) {
            console.error('Failed to fetch previous doc', error);
            dispatch({ type: 'SET_ERROR', payload: 'Could not load previous document' });
        }

    }, [state.historyStack]);

    useEffect(() => {
        if (caseId) {
            fetchTags();
            fetchNextDocument();
        }
    }, [caseId, fetchTags, fetchNextDocument]);

    return (
        <ReviewContext.Provider value={{ ...state, fetchNextDocument, submitCoding, fetchTags, goPrevious, skipDocument }}>
            {children}
        </ReviewContext.Provider>
    );
};

export const useReview = (): ReviewContextType => {
    const context = useContext(ReviewContext);
    if (context === undefined) {
        throw new Error('useReview must be used within a ReviewProvider');
    }
    return context;
};
