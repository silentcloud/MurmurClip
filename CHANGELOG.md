# Changelog

All notable changes to MurmurClip are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-07-14

### Changed
- Rewrote core script from Python to JavaScript (eliminates Python environment dependency)
- Uses PopClip's built-in JS engine + bundled `axios` library — zero external dependencies
- Default service changed from macOS Translation to AI Service (broader compatibility)
- macOS Translation now shows a clear settings error (JS environment cannot invoke Swift directly)
- Ollama over `http://` now shows a clear settings error (blocked by App Transport Security);
  HTTPS Ollama endpoints still work via the Custom provider

## [1.0.0] - 2026-07-14

### Added
- Initial release
- Auto mode: auto-detects language and decides to translate or polish
- Translate mode: always translate to the target language
- Polish mode: always fix grammar and style
- macOS Translation Framework backend (requires macOS 15+)
- AI backend with support for:
  - OpenAI (default: `gpt-4o-mini`)
  - Anthropic Claude (default: `claude-3-5-sonnet-20241022`)
  - Ollama (local, default: `llama3.1`)
  - Custom OpenAI-compatible endpoints
- Configurable source and target languages (Chinese, English, Japanese, Korean, French, German, Spanish)
- Three result actions: paste (replace selection), copy to clipboard, preview
- API keys stored securely in macOS Keychain via PopClip's `secret` option type
- Custom system prompt support with `{mode}`, `{source}`, `{target}` placeholders
- GitHub Actions workflow for automatic `.popclipextz` release builds
