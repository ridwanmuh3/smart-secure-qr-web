import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-03-16",

  future: {
    compatibilityVersion: 4,
  },

  modules: ["@nuxtjs/supabase"],

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  supabase: {
    redirect: false,
  },

  nitro: {
    experimental: {
      asyncContext: true,
    },
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_KEY,
    },
  },

  app: {
    head: {
      title: "Smart Secure QR-Code",
      meta: [
        {
          name: "description",
          content:
            "QR Code-based document verification system with time-lock encryption",
        },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@300..700&display=swap",
        },
      ],
    },
  },
});
