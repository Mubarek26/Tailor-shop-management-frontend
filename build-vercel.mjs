import { cpSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { resolve } from "path";
import { build } from "esbuild";

const root = process.cwd();
const out = resolve(root, ".vercel/output");

rmSync(out, { recursive: true, force: true });

// 1. Static files
console.log("📁 Copying static files...");
mkdirSync(`${out}/static`, { recursive: true });
cpSync(resolve(root, "dist/client"), `${out}/static`, { recursive: true });

// 2. Bundle SSR server into a single Node.js CJS file
console.log("📦 Bundling SSR server...");
const funcDir = `${out}/functions/index.func`;
mkdirSync(funcDir, { recursive: true });

// Write a Node.js HTTP adapter next to server.js (so relative imports resolve)
const adapterPath = resolve(root, "dist/server/_entry.mjs");
writeFileSync(
  adapterPath,
  `import server from './server.js';

export default async function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const url = new URL(req.url, proto + '://' + host);

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (typeof val === 'string') headers.set(key, val);
    else if (Array.isArray(val)) val.forEach(v => headers.append(key, v));
  }

  const method = req.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);

  const webReq = new Request(url.toString(), {
    method,
    headers,
    body: hasBody ? req : undefined,
    ...(hasBody ? { duplex: 'half' } : {}),
  });

  const response = await server.fetch(webReq);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));

  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  res.end();
}
`
);

// Bundle everything (server.js + all npm deps) into one CJS file
await build({
  entryPoints: [adapterPath],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: `${funcDir}/index.js`,
  format: "cjs",
  external: ["node:*"],
  logLevel: "warning",
});

rmSync(adapterPath);

// 3. Function config — Node.js runtime
writeFileSync(
  `${funcDir}/.vc-config.json`,
  JSON.stringify({ runtime: "nodejs20.x", handler: "index.js", launcherType: "Nodejs" }, null, 2)
);

// 4. Vercel routing config
console.log("🔧 Writing output config...");
writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: "^/assets/(.*)$",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2
  )
);

console.log("✅ .vercel/output/ ready for deployment");
