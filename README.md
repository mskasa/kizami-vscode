# kizami

VS Code extension for [kizami](https://github.com/mskasa/kizami) — shows related ADRs and design documents in the sidebar when a source file is opened.

## Requirements

- [kizami](https://github.com/mskasa/kizami) CLI installed and available on PATH
- A workspace containing `kizami.toml`

## Features

- **Related Documents sidebar** — automatically shows which kizami documents mention the current file, powered by `kizami blame`
- **Click to preview** — clicking a document opens it in VS Code's built-in Markdown preview
- **Open in Editor** — right-click a document item to open it in the text editor instead
- **Refresh button** — manually refresh the sidebar from the panel title bar
- **Explorer context menu** — right-click any file and select "Find Related kizami Documents"
- **Clear error messages** — if the kizami binary is not found, the sidebar shows a clickable link to the install guide

## Usage

Open any file in a kizami-managed repository. The **kizami** panel in the Activity Bar automatically shows all documents related to the current file.

To find documents related to a specific file without opening it, right-click the file in the Explorer and select **Find Related kizami Documents**.

## Configuration

| Setting             | Default    | Description                                    |
| ------------------- | ---------- | ---------------------------------------------- |
| `kizami.binaryPath` | `"kizami"` | Path to the kizami binary if not on PATH       |

## Development

See [CLAUDE.md](CLAUDE.md) for development setup and architecture notes.
