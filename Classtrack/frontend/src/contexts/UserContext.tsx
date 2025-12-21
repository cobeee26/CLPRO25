import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import authService from '../services/authService';

interface User {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  profile_picture_url: string | null;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
    
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('❌ No auth token found in localStorage');
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('🔄 Fetching user profile from backend...');
      console.log('🔑 Token present:', !!token);
      
      const userData = await authService.getCurrentUserProfile();
      console.log('✅ User profile fetched successfully:', {
        id: userData.id,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        profile_picture_url: userData.profile_picture_url
      });
      setUser(userData);
    } catch (err: any) {
      console.error('❌ Failed to fetch user profile:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      if (err.response?.status === 401) {
        console.log('🔑 Token is invalid (401), clearing and redirecting to login');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        setUser(null);
        setError('Session expired. Please log in again.');
      } else if (err.response?.status === 403) {
        console.log('🚫 Access forbidden (403)');
        setError('Access denied. Please check your permissions.');
        setUser(null);
      } else {
        setError(err.message || 'Failed to load user profile');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const fetchCurrentUser = async () => {
    console.log('🔄 Manual fetchCurrentUser called');
    await fetchUser();
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        if (e.newValue) {
          console.log('🔄 Auth token changed, refreshing user data...');
          fetchUser();
        } else {
          console.log('🗑️ Auth token removed, clearing user data...');
          setUser(null);
          setError(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const token = localStorage.getItem('authToken');
    if (token && !user) {
      console.log('🔑 Token exists but no user data, refreshing...');
      fetchUser();
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  const value: UserContextType = {
    user,
    loading,
    error,
    refreshUser,
    fetchCurrentUser,
    updateUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
