import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { mdsvex } from "mdsvex";
import { snippets_plugin } from "./snippets_plugin";

export default defineConfig({
  plugins: [snippets_plugin(), sveltekit(), mdsvex()],
});
