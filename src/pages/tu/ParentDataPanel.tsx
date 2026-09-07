import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users, Link2, X } from 'lucide-react';
import { ParentService } from '../../domains/parent/services/ParentService';

export default function ParentDataPanel() {
  const [parents, setParents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [linkingParentId, setLinkingParentId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [linkMessage, setLinkMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const pSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'parent')));
        setParents(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const sSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingParentId || !selectedStudentId) return;
    
    setLinkMessage(null);
    try {
      const res = await ParentService.linkStudent({
        parentId: linkingParentId,
        studentId: selectedStudentId,
        relationRole: 'Family',
        isPrimary: false,
        accessPermissions: ['view_only', 'attendance_read', 'grade_read']
      });
      
      if (res.isSuccess) {
        setLinkMessage({ type: 'success', text: 'Berhasil menghubungkan akun!' });
        setTimeout(() => setLinkingParentId(null), 1500);
      } else {
        setLinkMessage({ type: 'error', text: (res as any).getError() || 'Gagal menghubungkan akun.' });
      }
    } catch (err: any) {
      setLinkMessage({ type: 'error', text: err.message || 'Terjadi kesalahan.' });
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat data orang tua...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-600" />
          Data Orang Tua Terdaftar
        </h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-y border-gray-200">
                <th className="py-3 px-4 font-semibold">Nama Orang Tua</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">No. WhatsApp</th>
                <th className="py-3 px-4 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {parents.map((parent) => (
                <tr key={parent.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{parent.name || '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{parent.email}</td>
                  <td className="py-3 px-4 text-gray-600">{parent.waNumber || '-'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => { setLinkingParentId(parent.id); setLinkMessage(null); setSelectedStudentId(''); }}
                      className="text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Link2 className="w-4 h-4" /> Hubungkan Anak
                    </button>
                  </td>
                </tr>
              ))}
              {parents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500 italic">Belum ada akun orang tua yang terdaftar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Hubungkan */}
      {linkingParentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative">
            <button onClick={() => setLinkingParentId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hubungkan dengan Siswa</h3>
            <p className="text-sm text-gray-500 mb-4">Pilih siswa yang akan dihubungkan dengan akun orang tua ini.</p>
            
            {linkMessage && (
              <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${linkMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {linkMessage.text}
              </div>
            )}
            
            <form onSubmit={handleLink}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Siswa</label>
                <select 
                  required
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setLinkingParentId(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm">
                  Simpan Hubungan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
