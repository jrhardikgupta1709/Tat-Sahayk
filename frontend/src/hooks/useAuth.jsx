import { useContext } from 'react';
import { AuthContext } from './AuthContext';

// Re-export AuthProvider so existing imports keep working
export { default as AuthProvider } from './AuthContext';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
