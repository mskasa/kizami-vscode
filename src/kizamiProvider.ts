import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";

// Represents a single kizami document returned by `kizami blame`.
export class DocumentItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly filePath: string,
    status: string,
    date: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.description = [status, date].filter(Boolean).join(" · ");
    this.tooltip = filePath;
    this.resourceUri = vscode.Uri.file(filePath);
    this.command = {
      command: "kizami.openDocument",
      title: "Open Document",
      arguments: [filePath],
    };
    const isActive = status.toLowerCase() === "active";
    this.iconPath = new vscode.ThemeIcon(isActive ? "file-text" : "file");
    this.contextValue = "kizamiDocument";
  }
}

// Placeholder item shown when no documents are found or on error.
class MessageItem extends vscode.TreeItem {
  constructor(message: string, iconId = "info", command?: vscode.Command) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(iconId);
    this.contextValue = "kizamiMessage";
    if (command) {
      this.command = command;
    }
  }
}

interface BlameEntry {
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
function parseBlameOutput(stdout: string): BlameEntry[] {
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

export class KizamiDocumentsProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private currentFilePath: string | undefined;

  refresh(filePath: string | undefined): void {
    this.currentFilePath = filePath;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: vscode.TreeItem
  ): Promise<vscode.TreeItem[]> {
    if (element) {
      return [];
    }

    if (!this.currentFilePath) {
      return [new MessageItem("No file open")];
    }

    // Only run blame for files inside a kizami workspace.
    const workspaceRoot = this.findWorkspaceRoot(this.currentFilePath);
    if (!workspaceRoot) {
      return [new MessageItem("No kizami.toml found")];
    }

    return this.runBlame(workspaceRoot, this.currentFilePath);
  }

  // Walk up from filePath until we find kizami.toml, or return undefined.
  private findWorkspaceRoot(filePath: string): string | undefined {
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

  private async runBlame(
    workspaceRoot: string,
    filePath: string
  ): Promise<vscode.TreeItem[]> {
    const binaryPath =
      vscode.workspace
        .getConfiguration("kizami")
        .get<string>("binaryPath") ?? "kizami";

    // Pass the relative path so kizami can match it against Related Files entries.
    const relativePath = path.relative(workspaceRoot, filePath);

    return new Promise((resolve) => {
      cp.exec(
        `${binaryPath} blame ${JSON.stringify(relativePath)}`,
        { cwd: workspaceRoot },
        (error, stdout, stderr) => {
          if (error) {
            const isNotFound =
              (error as NodeJS.ErrnoException).code === "ENOENT";
            if (isNotFound) {
              resolve([
                new MessageItem(
                  "kizami binary not found — click to install",
                  "warning",
                  {
                    command: "kizami.openInstallGuide",
                    title: "Open Install Guide",
                  }
                ),
              ]);
              return;
            }
            const msg = stderr?.trim() || error.message;
            resolve([new MessageItem(`Error: ${msg}`, "error")]);
            return;
          }

          // `kizami blame` exits 0 even when nothing is found.
          if (stdout.trim().startsWith("No decisions found")) {
            resolve([new MessageItem("No related documents")]);
            return;
          }

          const entries = parseBlameOutput(stdout);
          if (entries.length === 0) {
            resolve([new MessageItem("No related documents")]);
            return;
          }

          const items = entries.map((e) => {
            const absPath = path.isAbsolute(e.filePath)
              ? e.filePath
              : path.join(workspaceRoot, e.filePath);
            return new DocumentItem(e.title || path.basename(absPath, ".md"), absPath, e.status, e.date);
          });
          resolve(items);
        }
      );
    });
  }
}
