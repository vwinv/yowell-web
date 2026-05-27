import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  devtools: { enabled: true },
  build: {
    transpile: ["@yowell/shared"],
  },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "YO'WELL — Administration",
      link: [{ rel: "icon", type: "image/png", href: "/logo.png" }],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "http://localhost:3001/api",
      apiOrigin: process.env.NUXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001",
    },
  },
});
