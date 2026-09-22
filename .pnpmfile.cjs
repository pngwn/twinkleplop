// src is not published, so a source condition would send any resolver that sets it to a missing file
// changesets publishes with pnpm, so this runs on release as well as pnpm pack
// pnpm-lock.yaml checksums this file, run pnpm install after editing it

function strip_source(target) {
  if (Array.isArray(target)) return target.map(strip_source);
  if (typeof target !== "object" || target === null) return target;
  const stripped = {};
  for (const [key, value] of Object.entries(target)) {
    if (key !== "source") stripped[key] = strip_source(value);
  }
  return stripped;
}

module.exports = {
  hooks: {
    beforePacking(manifest) {
      if (manifest.exports) manifest.exports = strip_source(manifest.exports);
      return manifest;
    },
  },
};
