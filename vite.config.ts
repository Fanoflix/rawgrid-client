import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const BASE_PATH = "/rawgrid-client/";

function redirectBasePathWithoutTrailingSlash(): Plugin {
  const basePathWithoutSlash = BASE_PATH.replace(/\/$/, "");
  return {
    name: "redirect-base-path-without-trailing-slash",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const [pathname, query] = (request.url ?? "").split("?");
        if (pathname !== basePathWithoutSlash) return next();
        response.statusCode = 301;
        response.setHeader("Location", BASE_PATH + (query ? `?${query}` : ""));
        response.end();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: BASE_PATH,
  plugins: [react(), tailwindcss(), redirectBasePathWithoutTrailingSlash()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
