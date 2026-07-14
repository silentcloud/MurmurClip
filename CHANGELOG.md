# Changelog

All notable changes to MurmurClip are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-07-14

### Added

- PopClip extension for translating or correcting selected text in one click
- **Auto language detection** — heuristic based on CJK character ratio distinguishes Chinese from other languages
- **Smart task routing**:
  - Same source/target language → grammar correction and natural rephrasing
  - Different languages → translation into natural, conversational target language
- **Three AI service backends**:
  - **OpenAI Compatible** — works with OpenAI and any `/v1/chat/completions` endpoint (default: `gpt-4o-mini`)
  - **Ollama (Local)** — zero-cost local inference via `http://localhost:11434/v1` (default: `llama3`)
  - **Anthropic Claude** — via `/v1/messages` API (default: `claude-sonnet-4-20250514`)
- **Configurable options** (all settable in PopClip's extension UI):
  - Source language: Auto Detect, Chinese, English, Japanese, Korean, French, German, Spanish
  - Target language: English, Chinese, Japanese, Korean, French, German, Spanish
  - Translation service selector
  - API Key (stored securely in macOS Keychain)
  - API Base URL (custom endpoint override)
  - Model name
- **Bilingual UI** — option labels and descriptions in both English and Simplified Chinese
- Result is pasted directly back, replacing the selected text (`paste-result`)
- Requires the `paste` command to be available in the active app (`requirements: ["text", "paste"]`)
- Error messages shown inline via `popclip.showText()` — no unexpected popups or settings dialogs
- HTTP requests made with native `XMLHttpRequest` — no external dependencies, no Python required
- GitHub Actions workflow: validates `Config.json`, checks JS syntax, packages `.popclipextz`, and publishes a GitHub Release on every `v*.*.*` tag push
