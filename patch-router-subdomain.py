with open("src/pages/public/website/RootRouter.tsx", "r") as f:
    content = f.read()

replacement = """
  useEffect(() => {
    if (domain) {
      localStorage.setItem('lastTenantSubdomain', domain);
      localStorage.setItem('tenantRoutingMode', 'saas');
      setLoading(true);
      websiteService.getTenantProfileByDomain(domain).then(res => {
"""
content = content.replace("  useEffect(() => {\n    if (domain) {\n      setLoading(true);\n      websiteService.getTenantProfileByDomain(domain).then(res => {", replacement.strip("\n"))

replacement2 = """
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
"""
content = content.replace("""
      if (!coreDomains.includes(hostname) && !isAIStudioPreview) {
        const result = await websiteService.getTenantProfileByDomain(hostname);
        if (result.isSuccess) {
          setCustomDomainProfile(result.getValue());
        }
      }
""", replacement2.strip("\n"))

with open("src/pages/public/website/RootRouter.tsx", "w") as f:
    f.write(content)
