import React, { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useTenant } from "../../../foundation/tenant/TenantContext";
import {
  LayoutTemplate,
  Settings,
  FileText,
  Megaphone,
  Calendar,
  Bookmark,
  Building2,
  Eye,
  ShieldAlert,
} from "lucide-react";

import ProfileTab from "./components/ProfileTab";
import CmsContentManager from "./components/CmsContentManager";

export default function WebsiteAdminPanel() {
  const { hasPermission } = useAuth();
  const { activeTenant } = useTenant();

  const [activeTab, setActiveTab] = useState("branding");

  if (!hasPermission("website:read") && !hasPermission("website:manage")) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-red-100 flex flex-col items-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
        <p className="text-gray-500">
          Anda tidak memiliki izin untuk mengakses modul Website CMS.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "branding", label: "Branding & Identitas", icon: Settings },
    { id: "halaman", label: "Halaman Profil", icon: FileText },
    { id: "berita", label: "Berita", icon: LayoutTemplate },
    { id: "pengumuman", label: "Pengumuman", icon: Megaphone },
    { id: "acara", label: "Acara", icon: Calendar },
    { id: "program", label: "Program", icon: Bookmark },
    { id: "fasilitas", label: "Fasilitas", icon: Building2 },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website & CMS</h1>
          <p className="text-gray-500 mt-1">
            Kelola konten dan tampilan website publik sekolah Anda.
          </p>
        </div>
        {activeTenant && (
          <div className="mt-4 md:mt-0">
            <a
              href={`/school/${activeTenant.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 shadow-sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Website
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mr-3 ${activeTab === tab.id ? "text-blue-700" : "text-gray-400"}`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1">
          {activeTab === "branding" && <ProfileTab />}
          {activeTab === "halaman" && (
            <CmsContentManager
              contentType="PAGE"
              title="Halaman Profil (Sejarah, Visi, Misi)"
            />
          )}
          {activeTab === "berita" && (
            <CmsContentManager contentType="ARTICLE" title="Berita Sekolah" />
          )}
          {activeTab === "pengumuman" && (
            <CmsContentManager
              contentType="ANNOUNCEMENT"
              title="Pengumuman Resmi"
            />
          )}
          {activeTab === "acara" && (
            <CmsContentManager contentType="EVENT" title="Acara & Kegiatan" />
          )}
          {activeTab === "program" && (
            <CmsContentManager contentType="PROGRAM" title="Program Unggulan" />
          )}
          {activeTab === "fasilitas" && (
            <CmsContentManager
              contentType="FACILITY"
              title="Fasilitas Sekolah"
            />
          )}
        </div>
      </div>
    </div>
  );
}
