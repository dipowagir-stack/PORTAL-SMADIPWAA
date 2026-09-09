import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, GraduationCap, Mail, Lock, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loginWithGoogle, loginWithEmailPassword, logout } from '../lib/firebase';

import { TenantPublicProfile } from '../domains/website/types';

export default function Login({ tenantProfile }: { tenantProfile?: TenantPublicProfile }) {
  const { user, profile, loading, refreshProfile, loginDecoupled } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginTab, setLoginTab] = useState<'password' | 'google'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // If user is logged in to global SaaS login
  useEffect(() => {
    if (user && !loading && !tenantProfile && profile) {
      const isPlatformUser = ['platform_admin', 'platform_support', 'platform_engineer'].includes(profile.role || '');
      // If it's a platform user, redirect will happen below.
      // If it's a school staff/teacher/student/admin, redirect to /app
    }
  }, [user, profile, loading, tenantProfile]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }

  if (user && profile) {
    // If it's a global SaaS login (!tenantProfile)
    if (!tenantProfile) {
      if (['platform_admin', 'platform_support', 'platform_engineer'].includes(profile.role || '')) {
        return <Navigate to="/platform" replace />;
      }
      if (profile.role === 'applicant') {
        return <Navigate to="/ppdb/dashboard" replace />;
      }
      return <Navigate to="/app" replace />;
    } else {
      // If it's a tenant login (tenantProfile exists)
      if (profile.role === 'applicant') {
        return <Navigate to="/ppdb/dashboard" replace />;
      }
      if (['platform_admin', 'platform_support', 'platform_engineer'].includes(profile.role || '')) {
        return <Navigate to="/platform" replace />;
      }
      return <Navigate to="/app" replace />;
    }
  }

  // Handle users who haven't set up profile yet
  if (user && !profile && !error) {
    if (tenantProfile) {
      return <Navigate to={`/setup-profile${location.search}`} replace />;
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      await loginWithGoogle();
      // On success, auth context will update and redirect
    } catch (err: any) {
      setError(err.message || 'Gagal login dengan Google');
      setIsLoggingIn(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Harap masukkan alamat email Anda.');
      return;
    }
    setIsLoggingIn(true);
    setError('');
    try {
      const authResult = await loginWithEmailPassword(email.trim(), password, tenantProfile?.id);
      if (authResult?.user) {
        await loginDecoupled(authResult.user);
      } else {
        await refreshProfile();
      }
    } catch (err: any) {
      setError(err.message || 'Email atau password tidak sesuai.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {tenantProfile?.logoUrl ? (
            <img src={tenantProfile.logoUrl} alt={tenantProfile.shortName || tenantProfile.schoolName} className="h-20 w-auto object-contain" />
          ) : (
            <div className="h-20 w-20 rounded-2xl shadow-lg flex items-center justify-center" style={{ backgroundColor: tenantProfile?.primaryColor || '#2563eb' }}>
              <span className="text-white font-bold text-4xl">
                {tenantProfile ? (tenantProfile.shortName || tenantProfile.schoolName || 'S').substring(0, 1).toUpperCase() : 'S'}
              </span>
            </div>
          )}
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          {tenantProfile ? (
            <>Login <span style={{ color: tenantProfile.primaryColor }}>{tenantProfile.shortName || tenantProfile.schoolName}</span></>
          ) : (
            <>School<span className="text-blue-600">SaaS</span> Login</>
          )}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {tenantProfile ? `Masuk ke akun ${tenantProfile.schoolName} Anda` : 'Masuk ke akun sekolah Anda'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          
          {/* Login Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setLoginTab('password'); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                loginTab === 'password'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => { setLoginTab('google'); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                loginTab === 'google'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Google Auth
            </button>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {loginTab === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email Terdaftar
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@sekolah.sch.id"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Akun migrasi dapat menggunakan password default: <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-600 font-mono">Sekolah123!</code>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {isLoggingIn ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                      <span>Memverifikasi...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <LogIn className="w-4 h-4" />
                      <span>Masuk ke Sistem</span>
                    </div>
                  )}
                </button>
              </form>
            ) : (
              <div>
                <p className="text-sm text-gray-500 text-center mb-6">
                  Silahkan login menggunakan akun Google Anda yang terdaftar pada sekolah Anda.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoggingIn ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                      <span>Memproses...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <LogIn className="w-5 h-5 text-blue-600" />
                      <span>Masuk dengan Google</span>
                    </div>
                  )}
                </button>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <Link to={location.pathname.startsWith('/s/') ? location.pathname.replace(/\/login.*$/, '') : '/'} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                &larr; Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
