#!/usr/bin/env node
// Verifies the npm tarball: exact contents, ESM + CJS smoke tests, optional leak scan.
// Usage: node scripts/check-pack.mjs [--leak-scan <path-to-script>]
// Run from the package root after `npm run build`.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const failures = [];
const fail = (msg) => failures.push(msg);

function finish(extra) {
  if (failures.length > 0) {
    for (const f of failures) console.error(`check-pack: FAIL: ${f}`);
    process.exit(1);
  }
  console.log(extra);
}

let leakScan;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--leak-scan" && argv[i + 1]) {
    leakScan = resolve(argv[++i]);
  } else {
    console.error(`check-pack: FAIL: unknown argument ${argv[i]}`);
    process.exit(2);
  }
}

const tmp = mkdtempSync(join(tmpdir(), "check-pack-"));
try {
  // ── Contents ──────────────────────────────────────────────
  let files = [];
  try {
    const out = execFileSync(npm, ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    files = JSON.parse(out)[0].files.map((f) => f.path);
  } catch (e) {
    fail(`npm pack --dry-run failed: ${e.message.split("\n")[0]}`);
    finish();
  }
  const allowed = new Set(["README.md", "LICENSE", "CHANGELOG.md", "package.json"]);
  for (const f of files) {
    if (!f.startsWith("dist/") && !allowed.has(f)) fail(`unexpected file in tarball: ${f}`);
  }
  const required = [
    "dist/esm/index.js",
    "dist/esm/index.d.ts",
    "dist/cjs/index.cjs",
    "dist/cjs/index.d.ts",
  ];
  if (existsSync("LICENSE")) required.push("LICENSE");
  for (const r of required) {
    if (!files.includes(r)) fail(`missing required file: ${r}`);
  }

  // ── Smoke ─────────────────────────────────────────────────
  const packOut = execFileSync(npm, ["pack", "--ignore-scripts", "--json", "--pack-destination", tmp], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const tarball = join(tmp, JSON.parse(packOut)[0].filename.replace(/^.*\//, ""));
  const proj = join(tmp, "proj");
  mkdirSync(proj);
  writeFileSync(join(proj, "package.json"), JSON.stringify({ name: "smoke", private: true }));
  const inst = spawnSync(
    npm,
    ["install", "--no-audit", "--no-fund", "--offline", "--ignore-scripts", tarball],
    { cwd: proj, encoding: "utf8" },
  );
  if (inst.status !== 0) {
    fail(`smoke install failed: ${(inst.stderr || "").trim().split("\n").pop()}`);
  } else {
    const checks = `
if (typeof AudactClient !== "function") throw new Error("AudactClient is not a function");
if (typeof AudactError !== "function") throw new Error("AudactError is not a function");
const c = new AudactClient({ apiKey: "x" });
if (!c.validator) throw new Error("client.validator missing");
if (!c.evidence) throw new Error("client.evidence missing");
`;
    writeFileSync(
      join(proj, "smoke.mjs"),
      `import { AudactClient, AudactError } from "@audactcore/sdk";\n${checks}`,
    );
    writeFileSync(
      join(proj, "smoke.cjs"),
      `const { AudactClient, AudactError } = require("@audactcore/sdk");\n${checks}`,
    );
    for (const [kind, file] of [["import", "smoke.mjs"], ["require", "smoke.cjs"]]) {
      const r = spawnSync(process.execPath, [file], { cwd: proj, encoding: "utf8" });
      if (r.status !== 0) {
        const line = (r.stderr || "").trim().split("\n").filter(Boolean).find((l) => /Error/.test(l)) ?? "non-zero exit";
        fail(`${kind} smoke failed: ${line}`);
      }
    }
  }

  // ── Leak scan ─────────────────────────────────────────────
  if (leakScan) {
    const ex = join(tmp, "extract");
    mkdirSync(ex);
    const t = spawnSync("tar", ["-xzf", tarball, "-C", ex]);
    if (t.status !== 0) {
      fail("could not extract tarball for leak scan");
    } else {
      const s = spawnSync(leakScan, [join(ex, "package")], { encoding: "utf8" });
      if (s.status !== 0) fail(`leak scan failed (exit ${s.status})`);
    }
  } else {
    console.log("leak scan: skipped (no --leak-scan given)");
  }

  finish(`check-pack: OK (${files.length} files)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
