import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const publicHtmlCacheHeaders = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Vercel-CDN-Cache-Control": "public, s-maxage=5, stale-while-revalidate=55",
};

const publicHtmlRouteRules = Object.fromEntries(
  [
    "/",
    "/address/**",
    "/addresses",
    "/addresses/**",
    "/blocks",
    "/blocks/**",
    "/dao",
    "/dao/**",
    "/masternodes",
    "/masternodes/**",
    "/peers",
    "/peers/**",
    "/transactions",
    "/transactions/**",
  ].map((route) => [route, { headers: publicHtmlCacheHeaders }]),
);

export default defineConfig(({ command }) => ({
  define: {
    "process.env.DASHSCAN_API_URL": JSON.stringify(
      process.env.DASHSCAN_API_URL,
    ),
    "process.env.NETWORK": JSON.stringify(process.env.NETWORK),
  },
  plugins: [
    ...(command === "serve" ? [devtools()] : []),
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      routeRules: publicHtmlRouteRules,
    }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
}));
