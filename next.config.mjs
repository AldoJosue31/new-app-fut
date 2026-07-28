import path from "node:path";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_APP_SUPABASE_URL ||
  "";

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_APP_SUPABASE_ANON_KEY ||
  "";

/** @type {import("next").NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      "ort.bundle.min.mjs": {
        browser: "onnxruntime-web",
      },
      fs: {
        browser: "./src/lib/browserEmptyModule.js",
      },
      path: {
        browser: "./src/lib/browserEmptyModule.js",
      },
    },
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias["ort.bundle.min.mjs"] = path.join(
        process.cwd(),
        "node_modules",
        "onnxruntime-web",
        "dist",
        "ort.bundle.min.mjs",
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },
};

export default nextConfig;
