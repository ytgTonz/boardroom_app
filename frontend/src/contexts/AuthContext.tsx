// frontend/src/contexts/AuthContext.tsx (FIXED VERSION)
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAppDispatch } from '../../redux/hooks';
import { setUser as setReduxUser, clearUser } from '../../redux/user-store/userSlice';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          // Map the API response to our expected format
          const userForContext: User = {
            _id: parsedUser.id || parsedUser._id,
            name: parsedUser.name,
            email: parsedUser.email,
            role: parsedUser.role
          };
          
          setUser(userForContext);
          
          // Also update Redux store
          dispatch(setReduxUser({
            _id: userForContext._id,
            name: userForContext.name,
            email: userForContext.email,
            role: userForContext.role
          }));
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          // Clear invalid data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, user: apiUser } = response;
      
      // Map API response to our expected User format
      const userForContext: User = {
        _id: apiUser.id, // API returns 'id', we need '_id'
        name: apiUser.name,
        email: apiUser.email,
        role: apiUser.role
      };
      
      // Store in localStorage (keep original API format for compatibility)
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(apiUser));
      
      // Update local state
      setUser(userForContext);
      
      // Update Redux store
      dispatch(setReduxUser({
        _id: userForContext._id,
        name: userForContext.name,
        email: userForContext.email,
        role: userForContext.role
      }));
      
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authAPI.register(name, email, password);
      const { token, user: apiUser } = response;
      
      // Map API response to our expected User format
      const userForContext: User = {
        _id: apiUser.id, // API returns 'id', we need '_id'
        name: apiUser.name,
        email: apiUser.email,
        role: apiUser.role
      };
      
      // Store in localStorage (keep original API format for compatibility)
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(apiUser));
      
      // Update local state
      setUser(userForContext);
      
      // Update Redux store
      dispatch(setReduxUser({
        _id: userForContext._id,
        name: userForContext.name,
        email: userForContext.email,
        role: userForContext.role
      }));
      
      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear local state
    setUser(null);
    
    // Clear Redux store
    dispatch(clearUser());
    
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};