import React, { useState, useEffect } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useTenant } from "../../../../foundation/tenant/TenantContext";
import { websiteService } from "../../../../domains/website/services/WebsiteService";
import { storageService } from "../../../../domains/document/services";
import { CmsContent, ContentStatus } from "../../../../domains/website/types";
import { Edit2, Plus, Save, Trash2, X, Image as ImageIcon } from "lucide-react";

interface Props {
  contentType: CmsContent["type"];
  title: string;
}

export default function CmsContentManager({ contentType, title }: Props) {
  const { hasPermission } = useAuth();
  const { activeTenant, securityContext } = useTenant();
  const [contents, setContents] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState<Partial<CmsContent>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (activeTenant && securityContext) {
      loadContents();
    }
  }, [activeTenant, securityContext, contentType]);

  const loadContents = async () => {
    setLoading(true);
    const res = await websiteService.getAllContents(
      securityContext!,
      contentType,
    );
    if (res.isSuccess) {
      setContents(res.getValue()!.filter((c) => c.type === contentType));
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityContext || !activeTenant) return;

    if (editingContent.id) {
      await websiteService.updateContent(
        securityContext,
        editingContent.id,
        editingContent,
      );
    } else {
      await websiteService.createContent(securityContext, {
        ...editingContent,
        type: contentType,
        tags: [],
      } as any);
    }
    setShowForm(false);
    loadContents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus konten ini?")) return;
    if (securityContext) {
      await websiteService.deleteContent(securityContext, id);
      loadContents();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeTenant) return;
    setUploadingImage(true);
    try {
      const file = e.target.files[0];
      const res = await storageService.uploadDocument(
        activeTenant.id,
        file,
        file.name,
      );
      if (res.isSuccess) {
        setEditingContent((prev) => ({
          ...prev,
          featuredImage: res.getValue(),
        }));
      } else {
        alert("Gagal mengupload gambar");
      }
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Memuat...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {!showForm ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {hasPermission("website:manage") && (
              <button
                onClick={() => {
                  setEditingContent({ type: contentType, status: "DRAFT" });
                  setShowForm(true);
                }}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Tambah Data
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-600">
                    Judul
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600">
                    Slug
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contents.length > 0 ? (
                  contents.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {c.title}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.slug}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${c.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingContent(c);
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      Belum ada {title.toLowerCase()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex justify-between items-center pb-4 border-b">
            <h3 className="text-lg font-bold text-gray-900">
              {editingContent.id ? `Edit ${title}` : `Tambah ${title}`}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Judul
              </label>
              <input
                type="text"
                required
                value={editingContent.title || ""}
                onChange={(e) =>
                  setEditingContent({
                    ...editingContent,
                    title: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug (URL)
              </label>
              <input
                type="text"
                required
                value={editingContent.slug || ""}
                onChange={(e) =>
                  setEditingContent({ ...editingContent, slug: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={editingContent.status || "DRAFT"}
                onChange={(e) =>
                  setEditingContent({
                    ...editingContent,
                    status: e.target.value as ContentStatus,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="DRAFT">Draft</option>
                {hasPermission("website:publish") && (
                  <option value="PUBLISHED">Published</option>
                )}
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ringkasan (Opsional)
              </label>
              <input
                type="text"
                value={editingContent.summary || ""}
                onChange={(e) =>
                  setEditingContent({
                    ...editingContent,
                    summary: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {contentType === "EVENT" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={editingContent.metadata?.startDate || ""}
                  onChange={(e) => setEditingContent({...editingContent, metadata: { ...editingContent.metadata, startDate: e.target.value }})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  value={editingContent.metadata?.endDate || ""}
                  onChange={(e) => setEditingContent({...editingContent, metadata: { ...editingContent.metadata, endDate: e.target.value }})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                <input
                  type="text"
                  value={editingContent.metadata?.location || ""}
                  onChange={(e) => setEditingContent({...editingContent, metadata: { ...editingContent.metadata, location: e.target.value }})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gambar Utama (Opsional)
            </label>
            <div className="flex items-center space-x-4">
              {editingContent.featuredImage && (
                <img
                  src={editingContent.featuredImage}
                  alt="Featured"
                  className="h-16 w-16 object-cover rounded"
                />
              )}
              <label className="flex items-center cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                <ImageIcon className="w-4 h-4 mr-2 text-gray-500" />
                {uploadingImage ? "Mengupload..." : "Pilih Gambar"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konten Utama (HTML/Markdown)
            </label>
            <textarea
              rows={12}
              required
              value={editingContent.content || ""}
              onChange={(e) =>
                setEditingContent({
                  ...editingContent,
                  content: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono text-sm"
              placeholder="<p>Isi konten...</p>"
            />
          </div>

          <div className="pt-4 flex space-x-3 border-t border-gray-200">
            <button
              type="submit"
              className="flex items-center bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" /> Simpan
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-300 px-6 py-2 rounded-lg font-medium hover:bg-gray-100"
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
