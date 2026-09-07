with open("src/pages/SetupProfile.tsx", "r") as f:
    content = f.read()

replacement = """
  if (profile) {
    if (profile.role === 'applicant') {
      return <Navigate to="/ppdb/dashboard" replace />;
    }
    if (['platform_admin', 'platform_support', 'platform_engineer'].includes(profile.role || '')) {
      return <Navigate to="/platform" replace />;
    }
    
    // Check for a specific redirect in URL
    const searchParams = new URLSearchParams(location.search);
    const redirectUrl = searchParams.get('redirect');
    if (redirectUrl) {
      return <Navigate to={redirectUrl} replace />;
    }
    
    // Default to app dashboard for tenant users
    return <Navigate to="/app" replace />;
  }
"""

content = content.replace("  if (profile) {\n    return <Navigate to=\"/\" replace />;\n  }", replacement.strip('\n'))

with open("src/pages/SetupProfile.tsx", "w") as f:
    f.write(content)

