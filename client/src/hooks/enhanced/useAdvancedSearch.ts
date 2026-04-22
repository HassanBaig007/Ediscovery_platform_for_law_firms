import { useState, useCallback } from 'react';
import { searchService, AdvancedSearchFilters } from '../../services/enhanced/search.service';

interface SearchResult {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  documentDate?: string;
  custodianId?: { _id: string; name: string } | string;
  coding?: { privilegeStatus: string; relevanceStatus: string };
  highlight?: { content?: string[]; filename?: string[] };
  docNumber?: number;
}

interface SearchState {
  results: SearchResult[];
  total: number;
  page: number;
  pages: number;
  isLoading: boolean;
  error: string | null;
}

export const useAdvancedSearch = () => {
  const [state, setState] = useState<SearchState>({
    results: [],
    total: 0,
    page: 1,
    pages: 1,
    isLoading: false,
    error: null,
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);

  const search = useCallback(async (filters: AdvancedSearchFilters, page = 1) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await searchService.advanced(filters, page);
      const data = res.data;
      setState({
        results: data.documents || data.hits || [],
        total: data.total || 0,
        page: data.page || page,
        pages: data.pages || 1,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err?.response?.data?.message || 'Search failed',
      }));
    }
  }, []);

  const getSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await searchService.suggest(query);
      setSuggestions(res.data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const clearResults = useCallback(() => {
    setState({ results: [], total: 0, page: 1, pages: 1, isLoading: false, error: null });
    setSuggestions([]);
  }, []);

  return { ...state, suggestions, search, getSuggestions, clearResults };
};
