import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { IUser } from '../../../shared/types';
import api from '../services/api';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface AuthState {
    user: IUser | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;

    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    setToken: (accessToken: string, refreshToken: string) => void;
    fetchUser: () => Promise<void>;
    setUser: (user: IUser) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,

            login: async (email: string, password: string) => {
                const response = await axios.post(`${BASE_URL}/auth/login`, { email, password });
                const { user, accessToken, refreshToken } = response.data.data;
                set({ user, accessToken, refreshToken, isAuthenticated: true });
            },

            logout: () => {
                set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
            },

            setToken: (accessToken: string, refreshToken: string) => {
                set({ accessToken, refreshToken });
            },

            fetchUser: async () => {
                try {
                    const response = await api.get('/auth/me');
                    if (response.data.success && response.data.data) {
                        set({ user: response.data.data });
                    }
                } catch (error) {
                    console.error('Failed to sync user profile:', error);
                }
            },

            setUser: (user: IUser) => {
                set({ user });
            },
        }),
        {
            name: 'ediscovery-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
