const { matchRoutes } = require("react-router-dom");

const routes = [
  {
    path: "/s/:domain/*",
    children: [
      {
        path: "/", // Equivalent to <Route path="/">
        children: [
          { path: "", element: "PublicHome" }, // index route
          { path: "berita/index", element: "PublicList" },
          { path: "halaman/:slug", element: "PublicArticle" },
          { path: "*", element: "PublicPages" }
        ]
      },
      { path: "login", element: "Login" },
      { path: "ppdb", element: "PPDBLanding" }
    ]
  },
  {
    path: "*", element: "Fallback"
  }
];

const match = matchRoutes(routes, "/s/smas-diponegoro/berita/index");
console.log(match ? match.map(m => m.route.path) : "No match");
