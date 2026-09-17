import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { mdsvex } from "mdsvex";
import { twoslash_plugin } from "./twoslash_plugin";

export default defineConfig({
  plugins: [twoslash_plugin(), sveltekit(), mdsvex()],
});
