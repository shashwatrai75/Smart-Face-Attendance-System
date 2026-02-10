import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getUser, setToken, setUser, removeToken, removeUser } from '../utils/jwt';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const userData = getUser();
    if (token && userData) {
      // Ensure userData is an object and has required fields
      if (typeof userData !== 'object' || userData === null || Array.isArray(userData)) {
        console.error('AuthContext: Invalid user data type, clearing storage');
        removeToken();
        removeUser();
        setLoading(false);
        return;
      }
      
      // Create a new object to avoid mutation issues
      const validUserData = {
        id: userData.id || userData._id || null,
        name: userData.name || 'User',
        email: userData.email || '',
        role: userData.role || 'viewer',
        institutionName: userData.institutionName || '',
      };
      
      console.log('AuthContext: Restoring user from localStorage:', validUserData);
      setUserState(validUserData);
    } else {
      console.log('AuthContext: No token or user data found');
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    console.log('AuthContext.login called with:', { token: token ? 'present' : 'missing', userData });
    if (!token || !userData) {
      console.error('Login called with missing token or userData');
      return;
    }
    
    // Ensure userData has all required fields
    const completeUserData = {
      id: userData.id || userData._id,
      name: userData.name || 'User',
      email: userData.email || '',
      role: userData.role || 'viewer',
      institutionName: userData.institutionName || '',
    };
    
    console.log('AuthContext: Saving complete user data:', completeUserData);
    setToken(token);
    setUser(completeUserData);
    setUserState(completeUserData);
    console.log('User state updated successfully');
  };

  const logout = () => {
    removeToken();
    removeUser();
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

