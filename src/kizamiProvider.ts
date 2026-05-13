import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import { BlameEntry, parseBlameOutput, findWorkspaceRoot } from "./utils";

// Represents a single kizami document returned by `kizami blame`.
export class DocumentItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly filePath: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.tooltip = filePath;
    this.resourceUri = vscode.Uri.file(filePath);
    this.command = {
      command: "kizami.openDocument",
      title: "Open Document",
      arguments: [filePath],
    };
    this.iconPath = new vscode.ThemeIcon("file-text");
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
    const workspaceRoot = findWorkspaceRoot(this.currentFilePath);
    if (!workspaceRoot) {
      return [new MessageItem("No kizami.toml found")];
    }

    return this.runBlame(workspaceRoot, this.currentFilePath);
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

          const activeEntries = entries.filter(
            (e) => e.status.toLowerCase() === "active"
          );
          if (activeEntries.length === 0) {
            resolve([new MessageItem("No related documents")]);
            return;
          }
          const items = activeEntries.map((e) => {
            const absPath = path.isAbsolute(e.filePath)
              ? e.filePath
              : path.join(workspaceRoot, e.filePath);
            // For sidecar files, open the managed file instead of the .kizami metadata file.
            const openPath = absPath.endsWith(".kizami")
              ? absPath.slice(0, -".kizami".length)
              : absPath;
            return new DocumentItem(e.title || path.basename(openPath), openPath);
          });
          resolve(items);
        }
      );
    });
  }
}
