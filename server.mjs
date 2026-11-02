import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://localhost`);
    let filePath = decodeURIComponent(url.pathname);
    if (filePath.endsWith("/")) filePath += "index.html";
    const fullPath = path.resolve(root, "." + filePath);
    if (!fullPath.startsWith(root)) throw new Error("forbidden");
    const info = await stat(fullPath);
    if (info.isDirectory()) return res.writeHead(302, { Location: filePath + "/" }).end();
    const data = await readFile(fullPath);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(fullPath)] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`\n  QICHI · 栖迟\n  http://127.0.0.1:${port}\n`);
});
