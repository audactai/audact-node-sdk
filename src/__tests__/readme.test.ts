/**
 * Typechecks every ```ts example in README.md against the SDK source.
 *
 * The README is the first code a user copies, and nothing else compiles it:
 * an example once called `createWebhook({ event_types: [...] })`, a field the
 * request type never had, and shipped that way. Each block is wrapped in an
 * async function (so top-level `await` and a re-declared `client` are fine),
 * with `client`, `process` and the main exports pre-declared, then compiled
 * with the TypeScript compiler API. `@audactcore/sdk` resolves to src/index.ts.
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const SDK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const README = fs.readFileSync(path.join(SDK_ROOT, "README.md"), "utf8");

/** Every ```ts fenced block, with the README line it starts on. */
function tsBlocks(markdown: string): { line: number; code: string }[] {
  const blocks: { line: number; code: string }[] = [];
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^```(ts|typescript)\s*$/.test(lines[i] ?? "")) continue;
    const start = i + 1;
    let end = start;
    while (end < lines.length && !/^```\s*$/.test(lines[end] ?? "")) end++;
    blocks.push({ line: start + 1, code: lines.slice(start, end).join("\n") });
    i = end;
  }
  return blocks;
}

/** Wraps one example so it compiles as a module on its own. */
function wrap(code: string): string {
  const lines = code.split("\n");
  const imports = lines.filter((l) => /^import\s/.test(l));
  const body = lines.filter((l) => !/^import\s/.test(l));
  return [
    `import * as __sdk from "@audactcore/sdk";`,
    ...imports,
    `declare const process: { env: Record<string, string | undefined> };`,
    `declare const client: __sdk.AudactClient;`,
    `export async function __example(): Promise<void> {`,
    `  const { AudactClient, AudactError, LOCAL_SERVICE_URLS } = __sdk;`,
    ...body,
    `}`,
  ].join("\n");
}

/** Compiles the wrapped examples; returns one formatted line per error. */
function typecheck(sources: Record<string, string>): string[] {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    types: [],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    baseUrl: SDK_ROOT,
    paths: { "@audactcore/sdk": ["src/index.ts"] },
  };
  const virtual = new Map(
    Object.entries(sources).map(([name, text]) => [path.join(SDK_ROOT, name), text]),
  );
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, ...rest) => {
    const text = virtual.get(fileName);
    return text !== undefined
      ? ts.createSourceFile(fileName, text, languageVersion)
      : getSourceFile(fileName, languageVersion, ...rest);
  };
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (f) => virtual.has(f) || fileExists(f);
  const readFile = host.readFile.bind(host);
  host.readFile = (f) => virtual.get(f) ?? readFile(f);

  const program = ts.createProgram([...virtual.keys()], options, host);
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
    if (d.file === undefined || d.start === undefined) return msg;
    const { line } = d.file.getLineAndCharacterOfPosition(d.start);
    return `${path.basename(d.file.fileName)}:${line + 1}: ${msg}`;
  });
}

describe("README examples", () => {
  const blocks = tsBlocks(README);

  it("has ts examples to check", () => {
    expect(blocks.length).toBeGreaterThanOrEqual(5);
  });

  it("every ts example typechecks against the SDK", () => {
    const sources = Object.fromEntries(
      blocks.map((b) => [`__readme_line_${b.line}.ts`, wrap(b.code)]),
    );
    expect(typecheck(sources)).toEqual([]);
  }, 30_000);

  it("rejects an example that uses a field the request type does not have", () => {
    const broken = `const endpoint = await client.webhooks.createWebhook({
  url: "https://example.com/hooks/audact",
  event_types: ["call.completed", "violation.detected"],
});`;
    const errors = typecheck({ "__broken.ts": wrap(broken) });
    expect(errors.join("\n")).toMatch(/event_types/);
  }, 30_000);
});
