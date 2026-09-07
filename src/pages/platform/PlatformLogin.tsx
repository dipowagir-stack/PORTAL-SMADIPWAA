import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Shield, Server } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { loginWithGoogle, logout } from '../../lib/firebase';

export default function PlatformLogin() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // If user is logged in but not a platform admin, sign them out.
  useEffect(() => {
    if (user && profile && !loading) {
      const isPlatformUser = ['platform_admin', 'platform_support', 'platform_engineer'].includes(profile.role || '');
      if (!isPlatformUser) {
        logout().then(() => {
          setError('Akses Ditolak: Akun Anda bukan merupakan Platform Administrator (Owner). Silakan login melalui halaman portal sekolah/tenant Anda.');
        }).catch(err => {
          console.error("Logout error", err);
        });
      }
    }
  }, [user, profile, loading]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div></div>;
  }

  if (user && profile) {
    if (['platform_admin', 'platform_support', 'platform_engineer'].includes(profile.role || '')) {
      return <Navigate to="/platform" replace />;
    } else {
      // Show the page with the error message since useEffect will log them out
      // We don't want to redirect them to "/"
    }
  }

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      await loginWithGoogle();
      // The authentication state will change, triggering useEffect
    } catch (err: any) {
      setError(err.message || 'Gagal login dengan Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Server className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-white">
          Platform HUB
        </h2>
        <p className="mt-2 text-center text-sm text-indigo-200">
          Administrator & Engineering Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-700">
          <div className="space-y-6">
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg flex items-start space-x-3">
              <Shield className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-indigo-200">
                Portal ini khusus untuk administrasi infrastruktur dan manajemen tenant tingkat sistem.
              </p>
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            
            <div>
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoggingIn ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                    <span>Otentikasi...</span>
                  </div>
                ) : (
                  <span>Login dengan SSO Korporat</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
