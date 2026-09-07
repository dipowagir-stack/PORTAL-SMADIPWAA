const { matchRoutes } = require("react-router-dom");

const routes = [
  {
    element: "Layout",
    children: [
      { index: true, element: "PublicHome" },
      { path: "berita/index", element: "PublicList" },
      { path: "halaman/:slug", element: "PublicArticle" },
      { path: "*", element: "PublicPages" }
    ]
  },
  { path: "login", element: "Login" },
  { path: "ppdb", element: "PPDBLanding" }
];

const match = matchRoutes(routes, "berita/index");
console.log("No leading slash:", match ? match.map(m => m.route.path || 'layout/index') : "No match");

const match2 = matchRoutes(routes, "/berita/index");
console.log("Leading slash:", match2 ? match2.map(m => m.route.path || 'layout/index') : "No match 2");
