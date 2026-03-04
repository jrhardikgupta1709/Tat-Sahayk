import { createContext, useState, useEffect } from 'react';
import { authService } from '../services';

export const AuthContext = createContext(null);

/** Silently detect browser location and push to backend */
function detectAndStoreLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const updated = await authService.updateLocation(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        // Keep local cache in sync
        localStorage.setItem('user', JSON.stringify(updated));
      } catch {
        // Non-critical — ignore
      }
    },
    () => {}, // denied — ignore
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authService.isLoggedIn()) {
      authService
        .getMe()
        .then((u) => {
          if (!cancelled) {
            setUser(u);
            localStorage.setItem('user', JSON.stringify(u));
            // Auto-detect location on session restore
            detectAndStoreLocation();
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      Promise.resolve().then(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    const u = await authService.login(email, password);
    setUser(u);
    // Auto-detect location right after login
    detectAndStoreLocation();
    return u;
  };

  const signup = async (payload) => {
    return authService.signup(payload);
  };

  const logout = () => {
    setUser(null);
    authService.logout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
