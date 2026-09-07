import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function TeacherToolsPanel() {
  const [tools, setTools] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<any>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const q = query(collection(db, 'teacher_tools'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTools(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingTool) {
        await updateDoc(doc(db, 'teacher_tools', editingTool.id), {
          title, description, url
        });
      } else {
        await addDoc(collection(db, 'teacher_tools'), {
          title, description, url, createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
      resetForm();
      fetchTools();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus tool ini?')) {
      try {
        await deleteDoc(doc(db, 'teacher_tools', id));
        fetchTools();
      } catch (e: any) {
        alert("Error: " + e.message);
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setUrl('');
    setEditingTool(null);
  };

  const openEdit = (tool: any) => {
    setEditingTool(tool);
    setTitle(tool.title);
    setDescription(tool.description || '');
    setUrl(tool.url);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Alat Bantu Guru (Tools)</h3>
          <p className="text-sm text-gray-500">Kelola link alat bantu seperti pembuat soal AI, dsb.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" /> Tambah Tool
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map(tool => (
          <div key={tool.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-bold text-gray-900 mb-1">{tool.title}</h4>
            <p className="text-sm text-gray-600 mb-4 h-10 overflow-hidden line-clamp-2">{tool.description}</p>
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                Buka Link <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <div className="flex space-x-2">
                <button onClick={() => openEdit(tool)} className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-md">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(tool.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-md">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {tools.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            Belum ada alat guru yang ditambahkan.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">{editingTool ? 'Edit Tool' : 'Tambah Tool Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Tool</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Misal: AI Pembuat Soal" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Singkat</label>
                <textarea required rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Alat untuk membuat RPP dan soal otomatis..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL / Link</label>
                <input required type="url" value={url} onChange={e => setUrl(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
