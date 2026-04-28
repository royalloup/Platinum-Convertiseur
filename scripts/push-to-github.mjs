import fs from "fs/promises";
import path from "path";

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "royalloup";
const REPO = "Platinum-Convertiseur";
const BRANCH = "main";
const API = "https://api.github.com";

const EXCLUDE_DIRS = new Set([
  "node_modules", ".git", ".cache", ".local", ".agents",
  "attached_assets", "dist", "build", "tmp", "out-tsc",
  ".expo", ".expo-shared", ".idea", ".vscode", ".cursor",
  ".github", "coverage", ".sass-cache",
]);

const EXCLUDE_FILES = new Set([
  ".DS_Store", "Thumbs.db", "npm-debug.log", "yarn-error.log",
  "testem.log", ".replit", ".replitignore",
]);

async function gh(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "replit-agent",
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function walk(dir, base = ".") {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = path.join(base, e.name);
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      out.push(...await walk(path.join(dir, e.name), rel));
    } else if (e.isFile()) {
      if (EXCLUDE_FILES.has(e.name)) continue;
      out.push(rel);
    }
  }
  return out;
}

async function main() {
  console.log("Walking project files...");
  const files = await walk(".");
  console.log(`Found ${files.length} files to push`);

  console.log("Bootstrapping empty repo with initial file...");
  try {
    await gh("PUT", `/repos/${OWNER}/${REPO}/contents/.bootstrap`, {
      message: "init",
      content: Buffer.from("init").toString("base64"),
      branch: BRANCH,
    });
  } catch (err) {
    if (!String(err).includes("already exists") && !String(err).includes("422")) {
      throw err;
    }
    console.log("  (already bootstrapped)");
  }

  console.log("Creating blobs (parallel batches)...");
  const tree = [];
  const CONCURRENCY = 12;
  let done = 0;
  async function uploadOne(f) {
    const buf = await fs.readFile(f);
    if (buf.length > 50 * 1024 * 1024) {
      console.log(`  [skip too big] ${f} (${buf.length} bytes)`);
      return null;
    }
    const blob = await gh("POST", `/repos/${OWNER}/${REPO}/git/blobs`, {
      content: buf.toString("base64"),
      encoding: "base64",
    });
    return { path: f.split(path.sep).join("/"), mode: "100644", type: "blob", sha: blob.sha };
  }
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(uploadOne));
    for (const r of results) if (r) tree.push(r);
    done += batch.length;
    console.log(`  blob ${done}/${files.length}`);
  }

  console.log("Creating tree...");
  const treeRes = await gh("POST", `/repos/${OWNER}/${REPO}/git/trees`, { tree });

  console.log("Fetching parent commit ref...");
  const ref = await gh("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  const parentSha = ref.object.sha;

  console.log("Creating commit...");
  const commit = await gh("POST", `/repos/${OWNER}/${REPO}/git/commits`, {
    message: "Initial commit — Convertisseur Platinum Warframe (Créé par Nuage02)",
    tree: treeRes.sha,
    parents: [parentSha],
  });

  console.log("Creating branch ref...");
  try {
    await gh("POST", `/repos/${OWNER}/${REPO}/git/refs`, {
      ref: `refs/heads/${BRANCH}`,
      sha: commit.sha,
    });
  } catch (err) {
    if (String(err).includes("Reference already exists")) {
      await gh("PATCH", `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
        sha: commit.sha,
        force: true,
      });
    } else {
      throw err;
    }
  }

  console.log(`\nDone! https://github.com/${OWNER}/${REPO}`);
}

main().catch(err => { console.error("FAILED:", err.message); process.exit(1); });
