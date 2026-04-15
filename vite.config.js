import { defineConfig } from "vite";

/**
 * GitHub Pages: project repos are served from /<repo-name>/.
 * The special <user>.github.io repo is served from /.
 * Override anytime: VITE_BASE_PATH=/custom/ npm run build
 */
function githubPagesBase() {
  if (process.env.VITE_BASE_PATH) return process.env.VITE_BASE_PATH;
  const full = process.env.GITHUB_REPOSITORY;
  if (!full) return "/";
  const [owner, name] = full.split("/");
  if (!owner || !name) return "/";
  if (name === `${owner}.github.io`) return "/";
  return `/${name}/`;
}

export default defineConfig({
  base: githubPagesBase(),
});
