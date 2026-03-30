import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(null);
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('auth-storage');

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.state.token) {
          setTokenState(parsed.state.token);
          setUserState(parsed.state.user);
        } else if (parsed.token) {
          setTokenState(parsed.token);
          setUserState(parsed.user);
        }
      } catch (e) {
        console.error('Failed to parse auth storage', e);
      }
    }
    setLoading(false);
  }, []);

  const setAuth = (newToken, newUser) => {
    setTokenState(newToken);
    setUserState(newUser);
    localStorage.setItem('auth-storage', JSON.stringify({ token: newToken, user: newUser }));
  };

  const logout = () => {
    setTokenState(null);
    setUserState(null);
    localStorage.removeItem('auth-storage');
  };

  // Prevent rendering app before auth is loaded so protected routes don't boot us early
  if (loading) return null;

  return (
    <AuthContext.Provider value={{ token, user, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper for APIs outside of React tree
export const getToken = () => {
  const stored = localStorage.getItem('auth-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.state) return parsed.state.token;
      return parsed.token;
    } catch {
      return null;
    }
  }
  return null;
};
