/**
 * Post-build script: renames .js files in dist/cjs to .cjs so that
 * the package.json "require" entry point resolves correctly when the
 * package type is "module".
 */
const fs = require("fs");
const path = require("path");

const cjsDir = path.join(__dirname, "..", "dist", "cjs");

if (!fs.existsSync(cjsDir)) {
  console.error("dist/cjs directory not found; skipping rename.");
  process.exit(0);
}

// Rewrites a file's content in place, writing only when something changed.
function rewrite(filePath, transform) {
  const content = fs.readFileSync(filePath, "utf8");
  const updated = transform(content);
  if (updated !== content) {
    fs.writeFileSync(filePath, updated, "utf8");
  }
}

function renameJsToCjs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      renameJsToCjs(fullPath);
    } else if (entry.name.endsWith(".js")) {
      const newPath = fullPath.replace(/\.js$/, ".cjs");
      fs.renameSync(fullPath, newPath);
      // tsc keeps the ".js" in relative specifiers (NodeNext-style imports in src), so
      // require("./client.js") must follow the rename or every require() of the package
      // fails with MODULE_NOT_FOUND. Bare specifiers (node:fs, packages) are untouched.
      rewrite(newPath, (c) =>
        c
          .replace(/require\((["'])(\.{1,2}\/[^"']*?)\.js\1\)/g, "require($1$2.cjs$1)")
          .replace(/^(\/\/# sourceMappingURL=.*)\.js\.map$/m, "$1.cjs.map"),
      );
    } else if (entry.name.endsWith(".js.map")) {
      const newPath = fullPath.replace(/\.js\.map$/, ".cjs.map");
      fs.renameSync(fullPath, newPath);
      rewrite(newPath, (c) => c.replace(/"file":"([^"]*)\.js"/, '"file":"$1.cjs"'));
    } else if (entry.name.endsWith(".d.ts")) {
      // Also update the source map references inside declaration files.
      const content = fs.readFileSync(fullPath, "utf8");
      const updated = content.replace(/\.js\.map/g, ".cjs.map");
      if (updated !== content) {
        fs.writeFileSync(fullPath, updated, "utf8");
      }
    }
  }
}

renameJsToCjs(cjsDir);
console.log("CJS output renamed: .js → .cjs");
