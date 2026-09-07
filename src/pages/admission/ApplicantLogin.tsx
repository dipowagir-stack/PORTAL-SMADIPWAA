import React, { useState } from 'react';
import { Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { loginWithGoogle } from '../../lib/firebase';

export default function ApplicantLogin() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div></div>;
  }

  if (user && profile) {
    return <Navigate to="/ppdb/dashboard" replace />;
  }

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Gagal masuk dengan Google');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/ppdb" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 mb-6 px-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Info PPDB
        </Link>
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-sm border border-emerald-200">
            <GraduationCap className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Portal Peserta PPDB
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Masuk atau daftar untuk memulai proses penerimaan
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-500 text-center mb-6">
                Gunakan akun Google pribadi yang aktif untuk mendaftar atau melanjutkan proses seleksi PPDB Anda.
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoggingIn ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                    <span>Memproses...</span>
                  </div>
                ) : (
                  <span>Lanjutkan dengan Google</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
