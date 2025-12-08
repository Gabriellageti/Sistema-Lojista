import { readFileSync } from "node:fs";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import { brandingPlaceholders } from "./src/config/branding";

const replaceBrandingPlaceholders = (content: string) =>
  Object.entries(brandingPlaceholders).reduce(
    (result, [placeholder, value]) => result.replaceAll(placeholder, value),
    content,
  );

const brandingPlugin = (): Plugin => {
  const manifestPath = path.resolve(__dirname, "public/manifest.json");
  const serviceWorkerPath = path.resolve(__dirname, "public/sw.js");

  return {
    name: "branding-placeholders",
    transformIndexHtml(html) {
      return replaceBrandingPlaceholders(html);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/manifest.json") {
          res.setHeader("Content-Type", "application/manifest+json");
          res.end(replaceBrandingPlaceholders(readFileSync(manifestPath, "utf-8")));
          return;
        }

        if (req.url === "/sw.js") {
          res.setHeader("Content-Type", "application/javascript");
          res.end(replaceBrandingPlaceholders(readFileSync(serviceWorkerPath, "utf-8")));
          return;
        }

        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: replaceBrandingPlaceholders(readFileSync(manifestPath, "utf-8")),
      });

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: replaceBrandingPlaceholders(readFileSync(serviceWorkerPath, "utf-8")),
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    brandingPlugin(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
