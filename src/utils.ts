import * as path from "path";
import * as fs from "fs";

export interface BlameEntry {
  title: string;
  date: string;
  status: string;
  filePath: string;
}

// Parse `kizami blame` stdout into BlameEntry list.
// Output format (one block per document):
//
//   Found N decision(s) mentioning "...":
//
//   [0001] 2026-03-12 | Active
//   Title: Use ripgrep fallback strategy
//   Path: /absolute/path/to/doc.md
//
export function parseBlameOutput(stdout: string): BlameEntry[] {
  const entries: BlameEntry[] = [];
  const lines = stdout.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Header line: [NNNN] YYYY-MM-DD | Status  OR  YYYY-MM-DD | Status
    const headerMatch = line.match(
      /^(?:\[\d+\]\s+)?(\d{4}-\d{2}-\d{2})\s+\|\s+(.+)$/
    );
    if (headerMatch) {
      const date = headerMatch[1];
      const status = headerMatch[2].trim();
      let title = "";
      let filePath = "";

      // Read following "Title:" and "Path:" lines.
      i++;
      while (i < lines.length) {
        const sub = lines[i].trim();
        if (sub.startsWith("Title: ")) {
          title = sub.slice("Title: ".length);
        } else if (sub.startsWith("Path: ")) {
          filePath = sub.slice("Path: ".length);
        } else if (sub === "" && filePath !== "") {
          // Blank line after Path: signals end of block.
          break;
        }
        i++;
      }

      if (filePath) {
        entries.push({ title, date, status, filePath });
      }
      continue;
    }

    i++;
  }

  return entries;
}

// Walk up from filePath until kizami.toml is found; returns the directory or undefined.
export function findWorkspaceRoot(filePath: string): string | undefined {
  let dir = path.dirname(filePath);
  const fsRoot = path.parse(dir).root;
  while (true) {
    if (fs.existsSync(path.join(dir, "kizami.toml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir || dir === fsRoot) {
      break;
    }
    dir = parent;
  }
  return undefined;
}
