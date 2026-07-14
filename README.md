# MurmurClip

> A PopClip extension that translates or polishes selected text in one click.

![PopClip](https://img.shields.io/badge/PopClip-Extension-blue)
![macOS](https://img.shields.io/badge/macOS-13%2B-lightgrey)
![License](https://img.shields.io/github/license/silentcloud/MurmurClip)
![Release](https://img.shields.io/github/v/release/silentcloud/MurmurClip)

---

## Features

- **Auto mode** (default) — intelligently decides what to do based on the selected text:
  - Already in the target language? → polish grammar and style
  - In a different language? → translate to the target language
- **Translate mode** — always translate
- **Polish mode** — always fix grammar, spelling, and style
- Configurable source / target languages (default: auto-detect → English)
- **Two backend services**:
  - **macOS Translation** — Apple's built-in framework, no API key needed (requires macOS 15+)
  - **AI Service** — OpenAI, Anthropic (Claude), Ollama (local), or any custom OpenAI-compatible endpoint
- Result action: paste (replace selection), copy to clipboard, or preview

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

Open PopClip → Extensions → MurmurClip settings.

| Option | Default | Description |
|--------|---------|-------------|
| Action Mode | Auto | Auto / Always translate / Always polish |
| Source Language | Auto detect | Auto, Chinese, English, Japanese, Korean, French, German, Spanish |
| Target Language | English | English, Chinese, Japanese, Korean, French, German, Spanish |
| Translation Service | macOS Translation | macOS Translation or AI Service |
| AI Provider | OpenAI | OpenAI / Anthropic / Ollama / Custom |
| AI Base URL | *(provider default)* | Override API endpoint. For Ollama: `http://localhost:11434` |
| AI Model | *(provider default)* | e.g. `gpt-4o-mini`, `claude-3-5-sonnet-20241022`, `llama3.1` |
| AI API Key | — | Stored securely in Keychain. Not needed for Ollama. |
| Custom System Prompt | — | Optional override. Supports `{mode}`, `{source}`, `{target}` placeholders. |
| After Action | Paste (replace) | Paste / Copy / Preview |

---

## AI Provider Setup

### OpenAI
- API Key: get one at [platform.openai.com](https://platform.openai.com)
- Default model: `gpt-4o-mini`

### Anthropic (Claude)
- API Key: get one at [console.anthropic.com](https://console.anthropic.com)
- Default model: `claude-3-5-sonnet-20241022`

### Ollama (local, no API key required)
```bash
brew install ollama
ollama serve          # keep running in background
ollama pull llama3.1  # or any other model
```
- Set Base URL to `http://localhost:11434` (it's the default)

### Custom OpenAI-compatible endpoint
- Set **AI Provider** to `Custom`
- Fill in **AI Base URL** (must implement `/v1/chat/completions`)
- Set **AI Model** to the model name your endpoint expects

---

## Requirements

| Requirement | Details |
|-------------|---------|
| PopClip | 2023.7+ (build 4050+) |
| macOS | 13 Ventura+ (macOS 15+ for system Translation) |
| Python 3 | Pre-installed on macOS |
| Network | Required for cloud AI providers |

---

## Repository Structure

```
MurmurClip/
├── MurmurClip.popclipext/
│   ├── Config.json       # Extension metadata, options, and actions
│   └── murmurclip.py     # Core translation / polishing logic
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
