/**
 * Post-build script: converts TanStack Start dist/ output into
 * Vercel Build Output API format at .vercel/output/
 *
 * dist/client/  -> .vercel/output/static/
 * dist/server/  -> .vercel/output/functions/index.func/
 */
import { cpSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { resolve } from "path";

const root = process.cwd();
const out = resolve(root, ".vercel/output");

// Clean previous output
rmSync(out, { recursive: true, force: true });

// 1. Static files: dist/client → .vercel/output/static
console.log("📁 Copying static files...");
mkdirSync(`${out}/static`, { recursive: true });
cpSync(resolve(root, "dist/client"), `${out}/static`, { recursive: true });

// 2. Edge function: dist/server → .vercel/output/functions/index.func
console.log("⚡ Building edge function...");
const funcDir = `${out}/functions/index.func`;
mkdirSync(funcDir, { recursive: true });

// Copy all server files (server.js + assets/)
cpSync(resolve(root, "dist/server"), funcDir, { recursive: true });

// Write the entry point wrapper: re-exports server.default.fetch
// Vercel Edge functions must export a default fetch handler
writeFileSync(
  `${funcDir}/entry.js`,
  `import handler from './server.js';
export default handler.fetch.bind(handler);
`
);

// Write Vercel function config (Edge runtime)
writeFileSync(
  `${funcDir}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "edge",
      entrypoint: "entry.js",
    },
    null,
    2
  )
);

// 3. Output config: route all non-static requests to the edge function
console.log("🔧 Writing Vercel output config...");
writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Static assets — serve directly
        {
          src: "^/assets/(.*)$",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        // Filesystem check (serves files from /static that exist)
        { handle: "filesystem" },
        // Everything else → SSR edge function
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2
  )
);

console.log("✅ .vercel/output/ ready for deployment");
