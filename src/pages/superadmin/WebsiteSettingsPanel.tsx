import React, { useState } from 'react';
import { Layout, Palette, FileText, Megaphone, Calendar, Bookmark, Building2, Eye, LayoutTemplate, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../foundation/tenant/TenantContext';
import ProfileTab from '../admin/website/components/ProfileTab';
import CmsContentManager from '../admin/website/components/CmsContentManager';
import WebsiteDomainTab from './WebsiteDomainTab';

export default function WebsiteSettingsPanel() {
  const { activeTenant } = useTenant();
  const [activeTab, setActiveTab] = useState('branding');

  const tabs = [
    { id: 'branding', label: 'Branding & Identitas', icon: Palette },
    { id: 'halaman', label: 'Halaman Profil', icon: FileText },
    { id: 'berita', label: 'Berita', icon: LayoutTemplate },
    { id: 'pengumuman', label: 'Pengumuman', icon: Megaphone },
    { id: 'acara', label: 'Acara', icon: Calendar },
    { id: 'program', label: 'Program', icon: Bookmark },
    { id: 'fasilitas', label: 'Fasilitas', icon: Building2 },
    { id: 'domain', label: 'Custom Domain', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Layout className="w-6 h-6 mr-2 text-blue-600" />
            Pengaturan Website & CMS
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Sesuaikan tampilan halaman depan publik dan portal login sekolah Anda.
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

      <div className="flex flex-col md:flex-row gap-6">
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mr-3 ${activeTab === tab.id ? 'text-blue-700' : 'text-gray-400'}`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden min-h-[600px]">
          {activeTab === 'branding' && <ProfileTab />}
          {activeTab === 'halaman' && (
            <CmsContentManager
              contentType="PAGE"
              title="Halaman Profil (Sejarah, Visi, Misi)"
            />
          )}
          {activeTab === 'berita' && (
            <CmsContentManager contentType="ARTICLE" title="Berita Sekolah" />
          )}
          {activeTab === 'pengumuman' && (
            <CmsContentManager
              contentType="ANNOUNCEMENT"
              title="Pengumuman Resmi"
            />
          )}
          {activeTab === 'acara' && (
            <CmsContentManager contentType="EVENT" title="Acara & Kegiatan" />
          )}
          {activeTab === 'program' && (
            <CmsContentManager contentType="PROGRAM" title="Program Unggulan" />
          )}
          {activeTab === 'fasilitas' && (
            <CmsContentManager
              contentType="FACILITY"
              title="Fasilitas Sekolah"
            />
          )}
          {activeTab === 'domain' && <WebsiteDomainTab />}
        </div>
      </div>
    </div>
  );
}
