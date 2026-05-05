import { mdsvex } from "mdsvex";
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: [vitePreprocess()],
  kit: {
    adapter: adapter(),
    prerender: {
      handleHttpError: "ignore",
      handleMissingId: "ignore",
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
