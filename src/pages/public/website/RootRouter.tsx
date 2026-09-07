import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';
import { VirtualModeProvider } from '../../../contexts/VirtualModeContext';
import { PeriodProvider } from '../../../contexts/PeriodContext';
import { TenantProvider } from '../../../foundation/tenant/TenantContext';
import Login from '../../../pages/Login';
import DashboardRouter from '../../../pages/DashboardRouter';
import PlatformHubDashboard from '../../../pages/platform/PlatformHubDashboard';
import ApplicantDashboard from '../../../pages/admission/ApplicantDashboard';
import PlatformLogin from '../../../pages/platform/PlatformLogin';
import ApplicantLogin from '../../../pages/admission/ApplicantLogin';
import { PlatformGuard } from '../../../components/guards/PlatformGuard';
import { TenantGuard } from '../../../components/guards/TenantGuard';
import { ApplicantGuard } from '../../../components/guards/ApplicantGuard';
import SetupProfile from '../../../pages/SetupProfile';
import PPDBLanding from '../../../pages/public/PPDBLanding';
import { websiteService } from '../../../domains/website/services/WebsiteService';
import { TenantPublicProfile } from '../../../domains/website/types';
import PublicWebsiteLayout from './PublicWebsiteLayout';
import PublicHome from './PublicHome';
import PublicArticle from './PublicArticle';
import PublicList from './PublicList';
import PublicPages from './PublicPages';
import SaasLanding from '../saas/SaasLanding';
import SaasSubscribe from '../saas/SaasSubscribe';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }
  
  if (!user) {
    const routingMode = localStorage.getItem('tenantRoutingMode');
    const lastSubdomain = localStorage.getItem('lastTenantSubdomain');
    
    let redirectPath = "/login";
    if (routingMode === 'saas' && lastSubdomain) {
      redirectPath = `/s/${lastSubdomain}/login`;
    }
    
    return <Navigate to={redirectPath} replace />;
  }
  
  if (!profile) {
    return <Navigate to="/setup-profile" replace />;
  }

  return <>{children}</>;
};

export default function RootRouter() {
  const [resolving, setResolving] = useState(true);
  const [customDomainProfile, setCustomDomainProfile] = useState<TenantPublicProfile | null>(null);

  useEffect(() => {
    const resolveDomain = async () => {
      const hostname = window.location.hostname;
      
      const coreDomains = [
        'localhost', 
        '127.0.0.1', 
        'schoolsaas.com',
      ];
      // Skip custom domain check if it's the AI Studio preview environment
      const isAIStudioPreview = hostname.includes('ais-dev-') || hostname.includes('ais-pre-');
      if (!coreDomains.includes(hostname) && !isAIStudioPreview) {
        const result = await websiteService.getTenantProfileByDomain(hostname);
        if (result.isSuccess) {
          setCustomDomainProfile(result.getValue());
          localStorage.setItem('tenantRoutingMode', 'custom_domain');
        } else {
          localStorage.setItem('tenantRoutingMode', 'saas');
        }
      } else {
         localStorage.setItem('tenantRoutingMode', 'saas');
      }      
      setResolving(false);
    };

    resolveDomain();
  }, []);

  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // 1. CUSTOM DOMAIN ROUTING (Tenant is mapped to the root domain)
  if (customDomainProfile) {
    return (
      <AuthProvider>
        <VirtualModeProvider>
          <PeriodProvider>
            <TenantProvider>
              <BrowserRouter>
                <Routes>
                  {/* Common Auth Routes */}
                  <Route path="/login" element={<Login tenantProfile={customDomainProfile} />} />
                  <Route path="/setup-profile" element={<SetupProfile />} />
                  
                  {/* PPDB Admissions */}
                  <Route path="/ppdb" element={<PPDBLanding />} />
                  <Route path="/ppdb/login" element={<ApplicantLogin />} />
                  <Route path="/ppdb/dashboard/*" element={<ApplicantGuard><ApplicantDashboard /></ApplicantGuard>} />
                  
                  {/* Protected Tenant Application Dashboard */}
                  <Route path="/app/*" element={<TenantGuard><DashboardRouter /></TenantGuard>} />
                  
                  {/* Public Website lives at root for Custom Domain */}
                  <Route path="/*" element={<TenantPublicWebsite profile={customDomainProfile} />} />
                </Routes>
              </BrowserRouter>
            </TenantProvider>
          </PeriodProvider>
        </VirtualModeProvider>
      </AuthProvider>
    );
  }

  // 2. DEFAULT SAAS ROUTING (SaaS Landing at root, tenants under /s/)
  return (
    <AuthProvider>
      <VirtualModeProvider>
        <PeriodProvider>
          <TenantProvider>
            <BrowserRouter>
              <Routes>
                {/* SaaS Public Routes */}
                <Route path="/" element={<SaasLanding />} />
                <Route path="/subscribe" element={<SaasSubscribe />} />
                
                {/* Tenant Public Website via Path (e.g. /s/dipowagir) */}
                <Route path="/s/:domain/*" element={<PublicWebsiteLoader />} />
                {/* Legacy redirect for old /school/:domain pattern */}
                <Route path="/school/:domain/*" element={<LegacySchoolRedirect />} />

                {/* Authentication */}
                <Route path="/login" element={<Login />} />
                <Route path="/setup-profile" element={<SetupProfile />} />
                
                {/* Platform Admin */}
                <Route path="/platform/login" element={<PlatformLogin />} />
                <Route path="/platform/*" element={<PlatformGuard><PlatformHubDashboard /></PlatformGuard>} />
                {/* Legacy paths */}
                <Route path="/platform-hub/login" element={<Navigate to="/platform/login" replace />} />
                <Route path="/platform-hub/*" element={<Navigate to="/platform" replace />} />

                {/* PPDB Admissions (can be specific to tenant later, keeping global for now) */}
                <Route path="/ppdb" element={<PPDBLanding />} />
                <Route path="/ppdb/login" element={<ApplicantLogin />} />
                <Route path="/ppdb/dashboard/*" element={<ApplicantGuard><ApplicantDashboard /></ApplicantGuard>} />
                
                {/* Protected Tenant Application Dashboard */}
                <Route path="/app/*" element={<TenantGuard><DashboardRouter /></TenantGuard>} />
                
                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </TenantProvider>
        </PeriodProvider>
      </VirtualModeProvider>
    </AuthProvider>
  );
}

function LegacySchoolRedirect() {
  const { domain } = useParams();
  const { pathname } = useLocation();
  const newPath = pathname.replace('/school/', '/s/');
  return <Navigate to={newPath} replace />;
}

function TenantPublicWebsite({ profile }: { profile: TenantPublicProfile }) {
  return (
    <Routes>
      <Route path="/" element={<PublicWebsiteLayout profile={profile} />}>
        <Route index element={<PublicHome />} />
        
        <Route path="berita/index" element={<PublicList profile={profile} type="ARTICLE" />} />
        <Route path="acara" element={<PublicList profile={profile} type="EVENT" />} />
        <Route path="pengumuman" element={<PublicList profile={profile} type="ANNOUNCEMENT" />} />
        
        <Route path="berita/:slug" element={<PublicArticle profile={profile} />} />
        <Route path="acara/:slug" element={<PublicArticle profile={profile} />} />
        <Route path="pengumuman/:slug" element={<PublicArticle profile={profile} />} />
        <Route path="halaman/:slug" element={<PublicArticle profile={profile} />} />
        
        <Route path="*" element={<PublicPages />} />
      </Route>
      {/* If a tenant has their own PPDB landing */}
      <Route path="login" element={<Login tenantProfile={profile} />} />
      <Route path="ppdb" element={<PPDBLanding />} />
    </Routes>
  );
}

function PublicWebsiteLoader() {
  const { domain } = useParams();
  const [profile, setProfile] = useState<TenantPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (domain) {
      localStorage.setItem('lastTenantSubdomain', domain);
      localStorage.setItem('tenantRoutingMode', 'saas');
      setLoading(true);
      websiteService.getTenantProfileByDomain(domain).then(res => {
        if (res.isSuccess) setProfile(res.getValue());
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [domain]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sekolah Tidak Ditemukan</h2>
          <p className="text-gray-500">Website sekolah untuk identifier <strong>{domain}</strong> tidak ditemukan atau belum diatur.</p>
        </div>
      </div>
    );
  }

  return <TenantPublicWebsite profile={profile} />;
}
