import React, { useState, useEffect } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useTenant } from "../../../../foundation/tenant/TenantContext";
import { websiteService } from "../../../../domains/website/services/WebsiteService";
import { storageService } from "../../../../domains/document/services";
import { TenantPublicProfile } from "../../../../domains/website/types";
import { Save, Eye, Upload } from "lucide-react";

export default function ProfileTab() {
  const { hasPermission } = useAuth();
  const { activeTenant, securityContext } = useTenant();
  const [formProfile, setFormProfile] = useState<Partial<TenantPublicProfile>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    if (activeTenant && securityContext) {
      loadProfile();
    }
  }, [activeTenant, securityContext]);

  const loadProfile = async () => {
    setLoading(true);
    const res = await websiteService.getTenantProfile(activeTenant!.id);
    if (res.isSuccess) {
      setFormProfile(res.getValue()!);
    } else {
      // Setup default if empty
      setFormProfile({
        tenantId: activeTenant!.id,
        schoolName: activeTenant!.name,
        officialName: activeTenant!.name,
        shortName: activeTenant!.name.substring(0, 15),
        primaryColor: "#1d4ed8",
        secondaryColor: "#f8fafc",
        accentColor: "#fbbf24",
        heroTitle: `Selamat Datang di ${activeTenant!.name}`,
        heroSubtitle: "Mendidik Generasi Masa Depan",
        address: "",
        phone: "",
        email: "",
        socialLinks: {},
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityContext || !activeTenant) return;
    await websiteService.updateTenantProfile(securityContext, formProfile);
    alert("Konfigurasi berhasil disimpan");
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof TenantPublicProfile,
  ) => {
    if (!e.target.files || !e.target.files[0] || !activeTenant) return;
    setUploadingField(field);
    try {
      const file = e.target.files[0];
      const res = await storageService.uploadDocument(
        activeTenant.id,
        file,
        file.name,
      );
      if (res.isSuccess) {
        setFormProfile((prev) => ({ ...prev, [field]: res.getValue() }));
      }
    } finally {
      setUploadingField(null);
    }
  };

  const updateSocialLink = (network: string, value: string) => {
    setFormProfile((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [network]: value },
    }));
  };

  if (loading) return <div className="p-4">Memuat...</div>;

  return (
    <form
      onSubmit={handleSave}
      className="space-y-8 bg-white p-6 rounded-xl border border-gray-100 shadow-sm"
    >
      {/* SECTION: IDENTITAS SEKOLAH */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">
          Identitas & Kontak
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Tampil Sekolah
            </label>
            <input
              type="text"
              required
              value={formProfile.schoolName || ""}
              onChange={(e) =>
                setFormProfile({ ...formProfile, schoolName: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Resmi (Yayasan/Legal)
            </label>
            <input
              type="text"
              value={formProfile.officialName || ""}
              onChange={(e) =>
                setFormProfile({ ...formProfile, officialName: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alamat Lengkap
            </label>
            <textarea
              rows={2}
              value={formProfile.address || ""}
              onChange={(e) =>
                setFormProfile({ ...formProfile, address: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telepon
            </label>
            <input
              type="text"
              value={formProfile.phone || ""}
              onChange={(e) =>
                setFormProfile({ ...formProfile, phone: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website Utama (URL)
            </label>
            <input
              type="url"
              value={formProfile.website || ""}
              onChange={(e) => setFormProfile({...formProfile, website: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Publik
            </label>
            <input
              type="email"
              value={formProfile.email || ""}
              onChange={(e) =>
                setFormProfile({ ...formProfile, email: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* SECTION: BRANDING & TEMA */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">
          Branding & Tema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warna Utama (Primary)
            </label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={formProfile.primaryColor || "#1d4ed8"}
                onChange={(e) =>
                  setFormProfile({
                    ...formProfile,
                    primaryColor: e.target.value,
                  })
                }
                className="h-10 w-12 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formProfile.primaryColor || "#1d4ed8"}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm bg-gray-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warna Sekunder (Secondary)
            </label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={formProfile.secondaryColor || "#f8fafc"}
                onChange={(e) =>
                  setFormProfile({
                    ...formProfile,
                    secondaryColor: e.target.value,
                  })
                }
                className="h-10 w-12 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formProfile.secondaryColor || "#f8fafc"}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm bg-gray-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warna Aksen (Accent)
            </label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={formProfile.accentColor || "#fbbf24"}
                onChange={(e) =>
                  setFormProfile({
                    ...formProfile,
                    accentColor: e.target.value,
                  })
                }
                className="h-10 w-12 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formProfile.accentColor || "#fbbf24"}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm bg-gray-50"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo Sekolah
            </label>
            <div className="flex items-center space-x-4">
              {formProfile.logoUrl ? (
                <img
                  src={formProfile.logoUrl}
                  alt="Logo"
                  className="h-16 w-16 object-contain bg-gray-50 border rounded"
                />
              ) : (
                <div className="h-16 w-16 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">
                  Kosong
                </div>
              )}
              <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                {uploadingField === "logoUrl" ? "Mengupload..." : "Ganti Logo"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "logoUrl")}
                  disabled={!!uploadingField}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Favicon (Ikon Tab)
            </label>
            <div className="flex items-center space-x-4">
              {formProfile.faviconUrl ? (
                <img
                  src={formProfile.faviconUrl}
                  alt="Favicon"
                  className="h-10 w-10 object-contain bg-gray-50 border rounded"
                />
              ) : (
                <div className="h-10 w-10 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">
                  Kosong
                </div>
              )}
              <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                {uploadingField === "faviconUrl"
                  ? "Mengupload..."
                  : "Ganti Favicon"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "faviconUrl")}
                  disabled={!!uploadingField}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: HOMEPAGE */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">
          Pengaturan Homepage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gambar Hero (Banner)
            </label>
            <div className="flex items-start space-x-4">
              {formProfile.heroImage ? (
                <img
                  src={formProfile.heroImage}
                  alt="Hero"
                  className="h-32 w-64 object-cover border rounded"
                />
              ) : (
                <div className="h-32 w-64 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                  Belum ada banner
                </div>
              )}
              <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                {uploadingField === "heroImage"
                  ? "Mengupload..."
                  : "Unggah Banner"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "heroImage")}
                  disabled={!!uploadingField}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul Utama (Hero Title)
            </label>
            <input
              type="text"
              value={formProfile.heroTitle || ""}
              onChange={(e) =>
                setFormProfile({ ...formProfile, heroTitle: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sub-judul (Hero Subtitle)
            </label>
            <input
              type="text"
              value={formProfile.heroSubtitle || ""}
              onChange={(e) =>
                setFormProfile({ ...formProfile, heroSubtitle: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sambutan Kepala Sekolah / Pengantar
            </label>
            <textarea
              rows={4}
              value={formProfile.principalWelcome || ""}
              onChange={(e) =>
                setFormProfile({
                  ...formProfile,
                  principalWelcome: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* SECTION: SOSIAL MEDIA */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">
          Sosial Media
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instagram URL
            </label>
            <input
              type="url"
              value={formProfile.socialLinks?.instagram || ""}
              onChange={(e) => updateSocialLink("instagram", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="https://instagram.com/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facebook URL
            </label>
            <input
              type="url"
              value={formProfile.socialLinks?.facebook || ""}
              onChange={(e) => updateSocialLink("facebook", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              YouTube URL
            </label>
            <input
              type="url"
              value={formProfile.socialLinks?.youtube || ""}
              onChange={(e) => updateSocialLink("youtube", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="https://youtube.com/..."
            />
          </div>
        </div>
            </div>

      {/* SECTION: SEO */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">
          Pengaturan SEO
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
            <input type="text" value={formProfile.seoConfig?.title || ""} onChange={(e) => setFormProfile({...formProfile, seoConfig: { ...formProfile.seoConfig!, title: e.target.value }})} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Judul untuk mesin pencari..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
            <textarea rows={2} value={formProfile.seoConfig?.description || ""} onChange={(e) => setFormProfile({...formProfile, seoConfig: { ...formProfile.seoConfig!, description: e.target.value }})} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Deskripsi untuk mesin pencari..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">SEO Keywords</label>
            <input type="text" value={formProfile.seoConfig?.keywords || ""} onChange={(e) => setFormProfile({...formProfile, seoConfig: { ...formProfile.seoConfig!, keywords: e.target.value }})} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="sekolah, sd, smp, sma, pendidikan..." />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t flex space-x-4 items-center">
        <button
          type="submit"
          disabled={!hasPermission("website:manage")}
          className="flex items-center bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2" /> Simpan Konfigurasi
        </button>
        {activeTenant && (
          <a
            href={`/school/${activeTenant.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50"
          >
            <Eye className="w-4 h-4 mr-2" /> Buka Web Preview
          </a>
        )}
      </div>
    </form>
  );
}
