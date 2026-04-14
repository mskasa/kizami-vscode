import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseBlameOutput, findWorkspaceRoot } from "../utils";

// ---------------------------------------------------------------------------
// parseBlameOutput
// ---------------------------------------------------------------------------

describe("parseBlameOutput", () => {
  it("parses a single entry", () => {
    const stdout = `
Found 1 decision(s) mentioning "src/foo.ts":

[0001] 2026-03-12 | Active
Title: Use ripgrep fallback strategy
Path: /workspace/docs/adr/0001-ripgrep.md

`;
    const entries = parseBlameOutput(stdout);
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].date, "2026-03-12");
    assert.strictEqual(entries[0].status, "Active");
    assert.strictEqual(entries[0].title, "Use ripgrep fallback strategy");
    assert.strictEqual(entries[0].filePath, "/workspace/docs/adr/0001-ripgrep.md");
  });

  it("parses multiple entries", () => {
    const stdout = `
Found 2 decision(s) mentioning "src/bar.ts":

[0001] 2026-03-12 | Active
Title: First decision
Path: /workspace/docs/adr/0001.md

[0002] 2026-04-01 | Deprecated
Title: Second decision
Path: /workspace/docs/adr/0002.md

`;
    const entries = parseBlameOutput(stdout);
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].title, "First decision");
    assert.strictEqual(entries[1].title, "Second decision");
    assert.strictEqual(entries[1].status, "Deprecated");
  });

  it("returns empty array when output contains no entries", () => {
    const stdout = `No decisions found mentioning "src/unknown.ts"\n`;
    const entries = parseBlameOutput(stdout);
    assert.strictEqual(entries.length, 0);
  });

  it("returns empty array for empty string", () => {
    assert.strictEqual(parseBlameOutput("").length, 0);
  });

  it("skips blocks without a Path line", () => {
    const stdout = `
[0001] 2026-03-12 | Active
Title: No path here

`;
    const entries = parseBlameOutput(stdout);
    assert.strictEqual(entries.length, 0);
  });

  it("handles header without index prefix", () => {
    const stdout = `
2026-03-12 | Active
Title: No index prefix
Path: /workspace/docs/adr/0001.md

`;
    const entries = parseBlameOutput(stdout);
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].title, "No index prefix");
  });
});

// ---------------------------------------------------------------------------
// findWorkspaceRoot
// ---------------------------------------------------------------------------

describe("findWorkspaceRoot", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kizami-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns the directory containing kizami.toml", () => {
    fs.writeFileSync(path.join(tmpDir, "kizami.toml"), "");
    const file = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(file), { recursive: true });

    const result = findWorkspaceRoot(file);
    assert.strictEqual(result, tmpDir);
  });

  it("finds kizami.toml in a parent directory", () => {
    fs.writeFileSync(path.join(tmpDir, "kizami.toml"), "");
    const nested = path.join(tmpDir, "a", "b", "c", "file.ts");
    fs.mkdirSync(path.dirname(nested), { recursive: true });

    const result = findWorkspaceRoot(nested);
    assert.strictEqual(result, tmpDir);
  });

  it("returns undefined when kizami.toml is not found", () => {
    const file = path.join(tmpDir, "file.ts");
    const result = findWorkspaceRoot(file);
    assert.strictEqual(result, undefined);
  });
});
