import * as vscode from "vscode";
import { KizamiDocumentsProvider } from "./kizamiProvider";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new KizamiDocumentsProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("kizamiDocuments", provider)
  );

  vscode.commands.executeCommand("setContext", "kizami.active", true);

  // Refresh when the active editor changes.
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      provider.refresh(editor?.document.uri.fsPath);
    })
  );

  // Show documents for the current file on startup.
  if (vscode.window.activeTextEditor) {
    provider.refresh(vscode.window.activeTextEditor.document.uri.fsPath);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "kizami.openDocument",
      (filePath: string) => {
        const uri = vscode.Uri.file(filePath);
        vscode.commands.executeCommand("markdown.showPreview", uri);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("kizami.refresh", () => {
      const editor = vscode.window.activeTextEditor;
      provider.refresh(editor?.document.uri.fsPath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "kizami.openInstallGuide",
      () => {
        vscode.env.openExternal(
          vscode.Uri.parse("https://github.com/mskasa/kizami#installation")
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "kizami.findRelated",
      (uri: vscode.Uri) => {
        provider.refresh(uri.fsPath);
        vscode.commands.executeCommand("kizamiDocuments.focus");
      }
    )
  );
}

export function deactivate(): void {}
