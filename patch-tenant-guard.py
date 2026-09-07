with open("src/components/guards/TenantGuard.tsx", "r") as f:
    content = f.read()

replacement = """
  if (!user || !profile) {
    const routingMode = localStorage.getItem('tenantRoutingMode');
    const lastSubdomain = localStorage.getItem('lastTenantSubdomain');
    
    let redirectPath = `/login?redirect=${encodeURIComponent(location.pathname)}`;
    
    if (routingMode === 'saas' && lastSubdomain) {
      redirectPath = `/s/${lastSubdomain}/login?redirect=${encodeURIComponent(location.pathname)}`;
    }
    
    return <Navigate to={redirectPath} replace />;
  }
"""

content = content.replace("  if (!user || !profile) {\n    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;\n  }", replacement.strip("\n"))

with open("src/components/guards/TenantGuard.tsx", "w") as f:
    f.write(content)
