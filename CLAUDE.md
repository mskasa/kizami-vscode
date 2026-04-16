# kizami-vscode — CLAUDE.md

## Project Overview

A VS Code extension for [kizami](https://github.com/mskasa/kizami) that shows related ADRs and design documents in a sidebar panel when a source file is opened.

The extension calls `kizami blame <file>` as a subprocess and displays the results as a clickable TreeView. Clicking a document item opens it in the Markdown preview.

**Companion repository:** [mskasa/kizami](https://github.com/mskasa/kizami) — the Go CLI that this extension depends on.

---

## Directory Structure

```
kizami-vscode/
├── src/
│   ├── extension.ts        # Activation, command registration, editor change listener
│   └── kizamiProvider.ts   # TreeDataProvider — calls `kizami blame`, parses output
├── media/
│   └── kizami.svg          # Activity bar icon
├── .vscode/
│   ├── launch.json         # F5 / Run → Start Debugging → Extension Development Host
│   └── tasks.json          # Default build task (tsc compile)
├── out/                    # Compiled JS (gitignored)
├── package.json            # Extension manifest
└── tsconfig.json
```

---

## Tech Stack

| Purpose        | Tool                      |
| -------------- | ------------------------- |
| Language       | TypeScript                |
| Extension API  | VS Code Extension API 1.85+ |
| Build          | tsc (no bundler)          |
| Subprocess     | Node.js `child_process.exec` |

---

## Development Setup

```bash
cd ~/Documents/github/mskasa/kizami-vscode
npm install
npm run compile     # one-shot build
npm run watch       # incremental rebuild
```

### Running the Extension

Open this folder in VS Code, then either:
- Press `F5`
- Or: **Run → Start Debugging**

This launches an **Extension Development Host** window. Open a workspace that contains `kizami.toml` (e.g. the `kizami` repository itself) to activate the extension.

### Updating the kizami binary

The extension shells out to `kizami`. After changes to the main kizami repo, rebuild the binary:

```bash
cd ~/Documents/github/mskasa/kizami
go build -o ~/go/bin/kizami .
```

---

## How It Works

1. **Activation** — triggered when the workspace contains `kizami.toml` (`activationEvents`)
2. **Editor change listener** — `onDidChangeActiveTextEditor` fires `KizamiDocumentsProvider.refresh(filePath)`
3. **Tree data** — `getChildren()` calls `kizami blame <relative-path>` via `cp.exec`
4. **Output parsing** — `parseBlameOutput()` in `kizamiProvider.ts` parses the multi-line format:
   ```
   Found N decision(s) mentioning "...":

   [0000] YYYY-MM-DD | Status
   Title: ...
   Path: /absolute/path/to/doc.md

   ```
5. **Click action** — opens the document in VS Code's built-in Markdown preview (`markdown.showPreview`)

### Key files

- `src/kizamiProvider.ts` — all data-fetching and parsing logic lives here
- `src/extension.ts` — wires up the provider and commands, minimal logic

---

## Configuration

| Setting              | Default    | Description                                              |
| -------------------- | ---------- | -------------------------------------------------------- |
| `kizami.binaryPath`  | `"kizami"` | Path to the kizami binary if not on PATH                 |

---

## Current State (prototype)

### Implemented
- [x] Sidebar TreeView showing related documents for the active file
- [x] Calls `kizami blame <file>` as subprocess
- [x] Parses multi-line output, displays title + status + date
- [x] Clicking a document opens Markdown preview
- [x] Activates only in workspaces with `kizami.toml`
- [x] Walk-up logic to find workspace root from any subdirectory file
- [x] `kizami.binaryPath` configuration setting

### Known Limitations
- No loading indicator during subprocess execution

---

## Backlog

### High
- [x] Show a clear error when `kizami` binary is not found, with a link to installation instructions
- [x] Right-click context menu on files: "Find related kizami documents"

### Medium
- [x] Refresh button in the TreeView title bar

### Low
- [ ] Package and publish to VS Code Marketplace
- [ ] CI workflow (lint + compile check on push)

---

## Branch & PR Workflow

Same conventions as the main kizami repo:
- One branch per feature: `feature/xxx`, `fix/xxx`
- Claude implements, commits, pushes, opens PR
- Owner reviews and merges via GitHub UI
- Use **squash merge**

---

## Relationship to kizami

The extension is a thin shell: it has no knowledge of kizami's internals.
All document discovery and parsing is delegated to the `kizami` CLI binary.

If `kizami blame` output format changes in the future, only `parseBlameOutput()` in `kizamiProvider.ts` needs updating.
