with open("src/pages/public/website/RootRouter.tsx", "r") as f:
    content = f.read()

replacement = """
  if (!user) {
    const routingMode = localStorage.getItem('tenantRoutingMode');
    const lastSubdomain = localStorage.getItem('lastTenantSubdomain');
    
    let redirectPath = "/login";
    if (routingMode === 'saas' && lastSubdomain) {
      redirectPath = `/s/${lastSubdomain}/login`;
    }
    
    return <Navigate to={redirectPath} replace />;
  }
"""

content = content.replace("  if (!user) {\n    return <Navigate to=\"/login\" replace />;\n  }", replacement.strip("\n"))

with open("src/pages/public/website/RootRouter.tsx", "w") as f:
    f.write(content)
