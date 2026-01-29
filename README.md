# Snailer GUI

Snailer GUI is a **macOS desktop app** (Tauri v2 + React) for running Snailer sessions with a modern UI, including **Classic** and **Team Orchestrator** modes.

[![CI](https://github.com/<ORG>/<REPO>/actions/workflows/ci.yml/badge.svg)](https://github.com/<ORG>/<REPO>/actions/workflows/ci.yml)
[![Release](https://github.com/<ORG>/<REPO>/actions/workflows/release-macos.yml/badge.svg)](https://github.com/<ORG>/<REPO>/actions/workflows/release-macos.yml)

> Replace `<ORG>/<REPO>` in the badge links after you publish this repository.

## Features
- **Two modes**: Classic + Team Orchestrator (multi-agent)
- **Right panel parity**: Agents / Files / Diff / Logs / Approvals / Raw
- **Session management**: new sessions, history, replay
- **Settings UI**: account, budgets, context, provider keys, orchestrator defaults
- **macOS distribution**: signed + notarized DMG via GitHub Releases (workflow included)

## Architecture (high level)
- **Frontend**: React + Zustand + Tailwind (`src/`)
- **Desktop shell**: Tauri v2 (`src-tauri/`)
- **Local engine**: Tauri launches the **npm-installed** Snailer CLI daemon (`snailer daemon …`) and communicates over `ws://127.0.0.1:<port>`

## Install (macOS)
Download the latest **DMG** from GitHub Releases and drag **Snailer.app** into **Applications**.

If Gatekeeper blocks the app:
1) Right‑click the app → **Open**
2) Or System Settings → **Privacy & Security** → allow anyway

Maintainers: see `RELEASING.md` for signing/notarization.

## Quick start (development)
### Prerequisites
- macOS (recommended: Apple Silicon)
- Node.js `>= 20`
- pnpm `>= 10`
- Rust (stable) + Cargo
- Xcode Command Line Tools

### Run
```bash
pnpm install
pnpm tauri:dev
```

### Build
```bash
pnpm build
pnpm tauri build
```

Universal build (Intel + Apple Silicon):
```bash
pnpm tauri build --target universal-apple-darwin
```

## Configuration
### API keys (shared .env)
Snailer GUI uses a **single shared env file**:
- `~/.snailer/.env`

Common keys:
- `CLAUDE_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `XAI_API_KEY`

Notes:
- Keys are **never displayed** after saving (UI only shows a masked tail).
- Some models may not require a user‑provided key depending on plan/login state.

## Security & privacy
### Does the app ship server URLs / API info?
Yes — like most desktop clients, the repository and the compiled app include some **service URLs** (e.g. upgrade links). In addition, the app can **download Node.js** (when needed) and run `npm install` to install the Snailer engine locally.

What it does **not** ship:
- Your `.env` keys (they live on your machine under `~/.snailer/.env`)
- Your account token / refresh token (stored in OS keychain; never committed)

If you intend to run against self-hosted services, configure the auth server address via `SNAILER_AUTH_ADDR` or `~/.snailer/gui_settings.json` (`authAddr`).

### Reporting security issues
Email: `team@snailer.ai`

## Contributing
PRs and issues are welcome. Suggested flow:
1) Open an issue with a clear reproduction or feature request
2) Keep PRs small and focused
3) Run checks locally:
   - `pnpm lint`
   - `pnpm test`
   - `pnpm build`
   - `cd src-tauri && cargo check`

## Releases
- CI runs on pushes and PRs: `/.github/workflows/ci.yml`
- DMG release runs on tags: `/.github/workflows/release-macos.yml`
- Detailed instructions: `RELEASING.md`

## License
Add a `LICENSE` file before publishing as open source.
