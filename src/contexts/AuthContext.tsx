
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react';

import { User } from '../types/user';
import {
    getLoggedInUser,
    logoutUser,
} from '../services/authService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    refreshAuth: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshAuth = async () => {
        try {
            const loggedInUser = await getLoggedInUser();
            setUser(loggedInUser);
        } catch (error) {
            console.error('Error checking login session:', error);
            setUser(null);
        }
    };

    useEffect(() => {
        const checkSession = async () => {
            try {
                const loggedInUser = await getLoggedInUser();
                setUser(loggedInUser);
            } catch (error) {
                console.error('Error loading login session:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkSession();
    }, []);

    const logout = async () => {
        await logoutUser();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                refreshAuth,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }

    return context;
}
