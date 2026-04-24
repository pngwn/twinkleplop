import { mdsvex } from "mdsvex";
import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: [vitePreprocess(), mdsvex()],
  kit: {
    adapter: adapter(),
    prerender: {
      handleHttpError: "ignore",
    },
  },
  extensions: [".svelte", ".svx"],
  compilerOptions: {
    experimental: {
      async: true,
    },
  },
};

export default config;
