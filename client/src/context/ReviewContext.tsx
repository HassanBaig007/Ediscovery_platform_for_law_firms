import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api from '../services/api';

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
}

type Action =
    | { type: 'SET_DOCUMENT'; payload: IDocument | null }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string }
    | { type: 'SET_TAGS'; payload: IIssueTag[] }
    | { type: 'PUSH_HISTORY'; payload: string }
    | { type: 'POP_HISTORY' };

const initialState: ReviewState = {
    currentDocument: null,
    queue: [],
    loading: true,
    error: null,
    tags: [],
    historyStack: []
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
        default:
            return state;
    }
};

interface ReviewContextType extends ReviewState {
    fetchNextDocument: (skipIds?: string[]) => Promise<void>;
    submitCoding: (data: unknown) => Promise<void>;
    fetchTags: () => Promise<void>;
    goPrevious: () => Promise<void>;
}


const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reviewReducer, initialState);
    const { id: caseId } = useParams<{ id: string }>();

    const fetchTags = useCallback(async () => {
        if (!caseId) return;
        try {
            const res = await api.get(`/cases/${caseId}/tags`);
            dispatch({ type: 'SET_TAGS', payload: res.data });
        } catch (error) {
            console.error('Failed to fetch tags', error);
        }
    }, [caseId]);

    const fetchNextDocument = useCallback(async (skipIds: string[] = []) => {
        // skipIds reserved for future queue optimization - currently handled by backend
        void skipIds; // Intentionally unused - parameter reserved for future implementation
        if (!caseId) return;

        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            // If we have a current doc, add to skip list? Or handled by backend 'unreviewed' filter?
            // Backend handles it.
            const res = await api.get(`/cases/${caseId}/review/queue`);
            dispatch({ type: 'SET_DOCUMENT', payload: res.data });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch document';
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
        }
    }, [caseId]);


    const submitCoding = useCallback(async (data: unknown) => {
        if (!state.currentDocument) return;

        try {
            const docId = state.currentDocument.id; // Use .id from frontend transform or check ._id

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
        } catch (error: unknown) {
            console.error('Coding failed', error);
            alert('Failed to save coding');
        }
    }, [state.currentDocument, fetchNextDocument]);


    const goPrevious = useCallback(async () => {
        if (state.historyStack.length === 0) return;

        const prevDocId = state.historyStack[state.historyStack.length - 1];
        dispatch({ type: 'POP_HISTORY' }); // Remove from stack
        dispatch({ type: 'SET_LOADING', payload: true });

        // Retrieve prev doc details
        // We need a route for GET /api/documents/:id or similar?
        // Reuse getReviewQueue? No.
        // We partially implemented GET /api/cases/:caseId/documents in Controller but that's a list.
        // We implemented GET /api/cases/:id/documents in PHASE 3? No, that was list.
        // We probably need a simple GET /api/documents/:id route for this.
        // Let's assume one exists or we add it quickly. 
        // Plan check: "Backend: Create Document Controller (Upload, List, Download)".
        // Did we create GetById? 
        // Document Routes had: upload, list, download.
        // We might need to add GetById to Document Controller.

        try {
            // Assuming this route exists or we will add it to document.controller
            const res = await api.get(`/documents/${prevDocId}`); // Need to implement this backend route!
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
        <ReviewContext.Provider value={{ ...state, fetchNextDocument, submitCoding, fetchTags, goPrevious }}>
            {children}
        </ReviewContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useReview = (): ReviewContextType => {

    const context = useContext(ReviewContext);
    if (context === undefined) {
        throw new Error('useReview must be used within a ReviewProvider');
    }
    return context;
};
