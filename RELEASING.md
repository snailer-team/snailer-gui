# Releasing Snailer (macOS)

This repo ships **Snailer GUI (Tauri)** as a **signed + notarized DMG** via **GitHub Releases**.

## What you get
- Universal macOS DMG (`intel + apple silicon`)
- Developer ID code signing
- Apple notarization + stapling
- Uploaded to GitHub Releases when you push a tag

## Workflows
- `/.github/workflows/ci.yml`: lint + test + build checks
- `/.github/workflows/release-macos.yml`: builds `universal-apple-darwin`, signs, notarizes, and uploads a DMG on `v*` tags

## Required GitHub Secrets
Add these in **GitHub → Settings → Secrets and variables → Actions**:

### Code signing (required)
- `APPLE_CERTIFICATE`: **base64-encoded** `.p12` for **Developer ID Application**
- `APPLE_CERTIFICATE_PASSWORD`: password for the `.p12`
- `APPLE_SIGNING_IDENTITY`: e.g. `Developer ID Application: Your Name (TEAMID)`
- `APPLE_TEAM_ID`: your Apple Developer Team ID

### Notarization (Apple ID method; required by current workflow)
- `APPLE_ID`: your Apple ID email (developer program)
- `APPLE_PASSWORD`: **app-specific password** for notarization

## How to cut a release
1) Bump versions if needed:
   - `package.json` (optional)
   - `src-tauri/tauri.conf.json` (`version`)
2) Push a tag:
   - `git tag v0.1.0`
   - `git push origin v0.1.0`
3) GitHub Actions builds and attaches:
   - `*.dmg`
   - `*.sha256`

## Notes
- The GUI enforces a shared env file for keys: `~/.snailer/.env`.
- If notarization fails, check the workflow logs for `notarytool` output first.

