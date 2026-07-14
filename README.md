# MurmurClip

> A PopClip extension that translates or corrects selected text in one click.

![PopClip](https://img.shields.io/badge/PopClip-Extension-blue)
![macOS](https://img.shields.io/badge/macOS-13%2B-lightgrey)
![License](https://img.shields.io/github/license/silentcloud/MurmurClip)
![Release](https://img.shields.io/github/v/release/silentcloud/MurmurClip)

---

## Features

- **Auto language detection** — select text in any app, MurmurClip figures out the language automatically
- **Translate or correct, automatically**:
  - Input in Chinese → translates to natural, conversational English
  - Input in English → corrects grammar and rephrases into idiomatic English
  - Any other language pair → translates to the configured target language
- **Three AI backends**:
  - **OpenAI Compatible** — OpenAI or any `/v1/chat/completions` endpoint
  - **Ollama** — fully local, no API key, no cost
  - **Anthropic Claude** — via the Claude API
- Result replaces the selected text in place
- Bilingual settings UI (English / 简体中文)
- No Python, no external dependencies — pure JavaScript using PopClip's built-in engine

---

## Install

### Option A — download release (recommended)

1. Go to the [Releases](https://github.com/silentcloud/MurmurClip/releases) page.
2. Download `MurmurClip.popclipextz`.
3. Double-click the file — PopClip will prompt you to install it.

### Option B — build from source

```bash
git clone https://github.com/silentcloud/MurmurClip.git
cd MurmurClip
zip -r MurmurClip.popclipextz MurmurClip.popclipext/
# Then double-click MurmurClip.popclipextz
```

---

## Configuration

Open PopClip → click the MurmurClip icon → ⚙ Settings.

| Option | Default | Description |
|--------|---------|-------------|
| Source Language | Auto Detect | Language of the input text. Auto Detect uses a CJK character heuristic. |
| Target Language | English | Language to translate into. When source = target, correction mode is used instead. |
| Translation Service | OpenAI Compatible | `OpenAI Compatible` / `Ollama (Local)` / `Anthropic Claude` |
| API Key | — | Required for OpenAI and Anthropic. Stored securely in Keychain. Leave empty for Ollama. |
| API Base URL | *(service default)* | Override the API endpoint. Leave empty to use the service default. |
| Model Name | `gpt-4o-mini` | Model to use. See per-service defaults below. |

---

## Service Setup

### OpenAI (or any OpenAI-compatible endpoint)

- **API Key**: get one at [platform.openai.com](https://platform.openai.com)
- **Default model**: `gpt-4o-mini`
- **Default base URL**: `https://api.openai.com/v1`
- Works with any service implementing the `/v1/chat/completions` API (e.g. Groq, Together, DeepSeek, local vLLM)

### Ollama (local, no API key required)

```bash
brew install ollama
ollama serve           # keep running in the background
ollama pull llama3     # or any other model you prefer
```

- **Default base URL**: `http://localhost:11434/v1`
- **Default model**: `llama3`
- No API key needed

### Anthropic Claude

- **API Key**: get one at [console.anthropic.com](https://console.anthropic.com)
- **Default model**: `claude-sonnet-4-20250514`
- **Default base URL**: `https://api.anthropic.com/v1`

---

## Requirements

| Requirement | Details |
|-------------|---------|
| PopClip | Build 4151+ |
| macOS | 13 Ventura+ |
| Network | Required for OpenAI and Anthropic; Ollama runs locally |

---

## Repository Structure

```
MurmurClip/
├── MurmurClip.popclipext/
│   ├── Config.json       # Extension metadata, options, and action definition
│   └── murmurclip.js     # Translation and correction logic
├── .github/
│   └── workflows/
│       └── release.yml   # Auto-build .popclipextz on tag push
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

---

## License

MIT — see [LICENSE](LICENSE).
