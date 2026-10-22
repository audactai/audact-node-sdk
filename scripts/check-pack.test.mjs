#!/usr/bin/env node
// Positive controls for check-pack.mjs. Runs against temporary copies of the package.
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const work = mkdtempSync(join(tmpdir(), "check-pack-test-"));
let passed = 0;
let failed = 0;
const skipped = 0;

function makeCopy(name) {
  const dir = join(work, name);
  cpSync(pkgRoot, dir, {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|dist|coverage)([\\/]|$)/.test(src.slice(pkgRoot.length)),
  });
  symlinkSync(join(pkgRoot, "node_modules"), join(dir, "node_modules"), "dir");
  const b = spawnSync(npm, ["run", "build"], { cwd: dir, encoding: "utf8" });
  if (b.status !== 0) throw new Error(`build failed in copy: ${b.stderr}`);
  return dir;
}

function run(dir, args = []) {
  const r = spawnSync(process.execPath, ["scripts/check-pack.mjs", ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`ok   - ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL - ${name}: ${e.message}`);
  }
}

function expectFail(res, text) {
  if (res.code === 0) throw new Error("expected failure, got success");
  if (!res.out.includes(text)) throw new Error(`output lacks "${text}": ${res.out.trim()}`);
}

try {
  test("extra entry in files fails with 'unexpected file'", () => {
    const d = makeCopy("extra");
    const p = JSON.parse(readFileSync(join(d, "package.json"), "utf8"));
    p.files.push("src");
    writeFileSync(join(d, "package.json"), JSON.stringify(p, null, 2));
    expectFail(run(d), "unexpected file");
  });

  test("deleted dist/cjs/index.cjs fails with 'missing'", () => {
    const d = makeCopy("missing");
    rmSync(join(d, "dist/cjs/index.cjs"));
    expectFail(run(d), "missing");
  });

  test("no-op rename-cjs breaks the require smoke", () => {
    const d = join(work, "norename");
    cpSync(pkgRoot, d, {
      recursive: true,
      filter: (src) => !/[\\/](node_modules|dist|coverage)([\\/]|$)/.test(src.slice(pkgRoot.length)),
    });
    symlinkSync(join(pkgRoot, "node_modules"), join(d, "node_modules"), "dir");
    writeFileSync(join(d, "scripts/rename-cjs.cjs"), "// no-op\n");
    const b = spawnSync(npm, ["run", "build"], { cwd: d, encoding: "utf8" });
    if (b.status !== 0) throw new Error("build failed in copy");
    expectFail(run(d), "require smoke failed");
  });

  test("failing leak scan fails check-pack", () => {
    const d = makeCopy("leak");
    const stub = join(work, "stub-scan.sh");
    writeFileSync(stub, "#!/bin/sh\necho 'leak found' >&2\nexit 1\n");
    chmodSync(stub, 0o755);
    expectFail(run(d, ["--leak-scan", stub]), "leak scan failed");
  });

  test("unmodified copy passes", () => {
    const d = makeCopy("clean");
    const r = run(d);
    if (r.code !== 0 || !r.out.includes("check-pack: OK")) throw new Error(r.out.trim());
  });
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`RESULT: ${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed === 0 && skipped === 0 ? 0 : 1);
