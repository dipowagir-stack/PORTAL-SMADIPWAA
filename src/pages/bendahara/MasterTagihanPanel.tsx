import React, { useState, useEffect } from 'react';
import { getBillingEventsOrderByDateResult, createBillingEventResult, updateBillingEventResult, deleteBillingEventResult } from '../../domains/finance/services';
import { getMasterCurriculumConfig } from '../../domains/academic/services';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

export default function MasterTagihanPanel() {
  const [events, setEvents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ title: '', amount: '', targetType: 'all', targetValue: '', dueDate: '', billingType: 'one_time' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resEvents = await getBillingEventsOrderByDateResult();
      if (resEvents.isSuccess) setEvents(resEvents.getValue());

      const docSnapRes = await getMasterCurriculumConfig();
      if (docSnapRes.isSuccess && docSnapRes.getValue()) {
        setClasses(docSnapRes.getValue()?.classes || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ev: any) => {
    setFormData({
      title: ev.title || '',
      amount: ev.amount?.toString() || '',
      targetType: ev.targetType || 'all',
      targetValue: ev.targetValue || '',
      dueDate: ev.dueDate ? new Date(ev.dueDate).toISOString().split('T')[0] : '',
      billingType: ev.billingType || 'one_time'
    });
    setEditingId(ev.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        title: formData.title,
        amount: Number(formData.amount),
        targetType: formData.targetType,
        targetValue: formData.targetType === 'class' ? formData.targetValue : '',
        dueDate: formData.dueDate ? new Date(formData.dueDate).getTime() : null,
        billingType: formData.billingType,
      };

      if (editingId) {
        await updateBillingEventResult(editingId, dataToSave);
      } else {
        await createBillingEventResult({ ...dataToSave, createdAt: new Date() });
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ title: '', amount: '', targetType: 'all', targetValue: '', dueDate: '', billingType: 'one_time' });
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan tagihan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus tagihan ini? Data historis yang terkait mungkin akan terpengaruh.')) return;
    try {
      await deleteBillingEventResult(id);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ title: '', amount: '', targetType: 'all', targetValue: '', dueDate: '', billingType: 'one_time' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Daftar Tagihan & Kegiatan</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-1" /> Buat Tagihan
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-gray-50 p-6 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2 flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800">{editingId ? 'Edit Tagihan' : 'Buat Tagihan Baru'}</h3>
            <button type="button" onClick={handleCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tagihan/Kegiatan</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500" placeholder="Misal: SPP Bulan Agustus" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
            <input required type="number" min="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500" placeholder="150000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batas Pembayaran (Opsional)</label>
            <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Tagihan</label>
            <select value={formData.billingType} onChange={e => setFormData({...formData, billingType: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500">
              <option value="one_time">Insidental (Sekali Bayar/Bisa Dicicil)</option>
              <option value="monthly">Bulanan (Rutin)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Peserta</label>
            <select value={formData.targetType} onChange={e => setFormData({...formData, targetType: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500">
              <option value="all">Semua Siswa</option>
              <option value="class">Kelas Tertentu</option>
            </select>
          </div>
          {formData.targetType === 'class' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kelas</label>
              <select required value={formData.targetValue} onChange={e => setFormData({...formData, targetValue: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500">
                <option value="">-- Pilih Kelas --</option>
                {classes.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="col-span-1 md:col-span-2 flex justify-end mt-4 space-x-2">
            <button type="button" onClick={handleCancel} className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-50">Batal</button>
            <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700">{editingId ? 'Simpan Perubahan' : 'Simpan Tagihan'}</button>
          </div>
        </form>
      )}

      {loading ? <div className="text-center py-10">Loading...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Nama Tagihan</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Jatuh Tempo</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-gray-500">Belum ada tagihan</td></tr> : null}
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{ev.title}</td>
                  <td className="px-4 py-3">{ev.billingType === 'monthly' ? 'Bulanan' : 'Insidental'}</td>
                  <td className="px-4 py-3 text-teal-600 font-bold">Rp {ev.amount?.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 capitalize">{ev.targetType === 'all' ? 'Semua Siswa' : 'Kelas ' + (ev.targetValue || 'Tertentu')}</td>
                  <td className="px-4 py-3">{ev.dueDate ? new Date(ev.dueDate).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => handleEdit(ev)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-md transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ev.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors" title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
