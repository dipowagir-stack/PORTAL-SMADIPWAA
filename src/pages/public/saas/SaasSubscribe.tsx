import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function SaasSubscribe() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: '',
    tenantId: '',
    email: '',
    plan: 'basic'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'subscription_requests'), {
        ...formData,
        status: 'PENDING',
        createdAt: Date.now()
      });
      alert('Terima kasih! Permintaan berlangganan Anda telah diterima. Tim kami akan segera menghubungi Anda.');
      navigate('/');
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">School<span className="text-blue-600">SaaS</span></span>
          </Link>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Daftar Sekolah Baru</h2>
          <p className="text-gray-500">Mulai langkah digitalisasi sekolah Anda hari ini.</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">Nama Sekolah</label>
              <input id="schoolName" name="schoolName" type="text" required value={formData.schoolName} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500" placeholder="Contoh: SMA Bina Bangsa" />
            </div>
            
            <div>
              <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">URL Sekolah (Tenant ID)</label>
              <div className="mt-1 flex rounded-xl shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  schoolsaas.com/s/
                </span>
                <input type="text" name="tenantId" id="tenantId" required value={formData.tenantId} onChange={handleChange} className="flex-1 block w-full px-4 py-3 border border-gray-300 rounded-none rounded-r-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="binabangsa" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Admin</label>
              <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500" placeholder="admin@sekolah.com" />
            </div>

            <div>
              <label htmlFor="plan" className="block text-sm font-medium text-gray-700">Pilihan Paket</label>
              <select id="plan" name="plan" value={formData.plan} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-white">
                <option value="basic">Paket Basic</option>
                <option value="professional">Paket Professional</option>
                <option value="enterprise">Paket Enterprise</option>
              </select>
            </div>
          </div>

          <div>
            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
              {loading ? 'Memproses...' : 'Buat Akun Sekolah'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Sudah punya akun? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Masuk di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
