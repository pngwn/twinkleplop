import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { mdsvex } from "mdsvex";

export default defineConfig({
  plugins: [sveltekit(), mdsvex()],
});
