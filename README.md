# kizami-vscode

VS Code extension for [kizami](https://github.com/mskasa/kizami) — shows related ADRs and design documents in the sidebar when a source file is opened.

## Requirements

- [kizami](https://github.com/mskasa/kizami) CLI installed and available on PATH
- A workspace containing `kizami.toml`

## Features

- **Related Documents sidebar** — automatically shows which kizami documents mention the current file
- Powered by `kizami blame` — no indexing required
- Clicking a document opens it in Markdown preview

## Usage

Open any file in a kizami-managed repository. The **kizami** panel in the Activity Bar shows all documents related to the current file.

## Configuration

| Setting             | Default    | Description                                    |
| ------------------- | ---------- | ---------------------------------------------- |
| `kizami.binaryPath` | `"kizami"` | Path to the kizami binary if not on PATH       |

## Development

See [CLAUDE.md](CLAUDE.md) for development setup and architecture notes.
