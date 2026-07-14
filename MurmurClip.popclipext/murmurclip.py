#!/usr/bin/env python3
"""
MurmurClip — PopClip extension for translation and text polishing.
Supports:
  - macOS Translation Framework (system built-in, requires macOS 15+)
  - AI services: OpenAI, Anthropic, Ollama, and custom OpenAI-compatible endpoints
"""

import json
import os
import sys
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def eprint(*args):
    """Print to stderr (PopClip ignores stderr; useful for debugging)."""
    print(*args, file=sys.stderr)


def get_opt(name, default=""):
    """Read a PopClip option from the environment (options are uppercased)."""
    return os.environ.get(f"POPCLIP_OPTION_{name.upper()}", default).strip()


def get_text():
    return os.environ.get("POPCLIP_TEXT", "")


# Language code → display name (used in prompt construction)
LANG_NAMES = {
    "zh": "Chinese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
}


def detect_language(text):
    """
    Heuristic language detection.
    Returns 'zh' if the text contains significant CJK characters, else 'en'.
    """
    cjk_count = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    ascii_count = sum(1 for c in text if c.isascii() and c.isalpha())
    total = cjk_count + ascii_count
    if total == 0:
        return "en"
    return "zh" if cjk_count / total > 0.3 else "en"


# ---------------------------------------------------------------------------
# macOS Translation Framework  (requires macOS 15 Sequoia+)
# ---------------------------------------------------------------------------

def translate_macos(text, source_lang, target_lang):
    """
    Invoke the macOS Translation framework via a temporary Swift script.
    Requires macOS 15+ and the Xcode command-line tools (swift).
    """
    swift_code = r"""
import Foundation
import Translation

let text = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ""
let src  = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : ""
let tgt  = CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : ""

let cfg  = TranslationSession.Configuration(
    source: Locale.Language(identifier: src),
    target: Locale.Language(identifier: tgt)
)
let session = try! TranslationSession(configuration: cfg)
let resp    = try! await session.translate(text)
FileHandle.standardOutput.write(resp.targetText.data(using: .utf8)!)
"""
    import tempfile
    import subprocess

    with tempfile.NamedTemporaryFile(mode='w', suffix='.swift', delete=False) as f:
        f.write(swift_code)
        swift_file = f.name

    try:
        result = subprocess.run(
            ['swift', swift_file, text, source_lang, target_lang],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            eprint(f"Swift translation error: {result.stderr}")
            _macos_unavailable()
        return result.stdout.strip()
    except Exception as e:
        eprint(f"macOS translation exception: {e}")
        _macos_unavailable()
    finally:
        os.unlink(swift_file)


def _macos_unavailable():
    print(
        "[MurmurClip] macOS Translation requires macOS 15+. "
        "Please switch to AI Service in MurmurClip settings.",
        end=""
    )
    sys.exit(1)


# ---------------------------------------------------------------------------
# AI service  (OpenAI-compatible / Anthropic / Ollama)
# ---------------------------------------------------------------------------

PROVIDER_DEFAULTS = {
    "openai":    {"base_url": "https://api.openai.com/v1",     "model": "gpt-4o-mini"},
    "anthropic": {"base_url": "https://api.anthropic.com/v1",  "model": "claude-3-5-sonnet-20241022"},
    "ollama":    {"base_url": "http://localhost:11434",         "model": "llama3.1"},
    "custom":    {"base_url": "",                               "model": ""},
}


def build_prompt(text, mode, source_lang, target_lang, custom_prompt=""):
    """Return (system_prompt, user_text) for the AI call."""
    src_name = LANG_NAMES.get(source_lang, source_lang) if source_lang != "auto" else "the source language"
    tgt_name = LANG_NAMES.get(target_lang, target_lang)

    if custom_prompt:
        system = (custom_prompt
                  .replace("{mode}", mode)
                  .replace("{source}", src_name)
                  .replace("{target}", tgt_name))
        return system, text

    if mode == "polish":
        system = (
            f"You are a language expert. Polish and correct the following {src_name} text. "
            f"Fix grammar, spelling, and punctuation. Make it sound natural and idiomatic "
            f"like a native speaker. Keep the original meaning. "
            f"Output ONLY the corrected text — no explanations."
        )
    elif mode == "translate":
        system = (
            f"You are a professional translator. Translate the following text "
            f"from {src_name} to {tgt_name}. "
            f"Use natural, idiomatic {tgt_name} as a native speaker would in everyday conversation. "
            f"Output ONLY the translation — no explanations, no notes."
        )
    else:  # auto
        system = (
            f"You are a language assistant. Examine the input:\n"
            f"- If it is already in {tgt_name}: polish it — fix grammar, spelling, and style "
            f"to sound like a native {tgt_name} speaker.\n"
            f"- If it is NOT in {tgt_name}: translate it into natural, conversational {tgt_name}.\n"
            f"Output ONLY the result — no explanations."
        )

    return system, text


def call_openai_compatible(base_url, api_key, model, system, user):
    """POST to an OpenAI-compatible /v1/chat/completions endpoint."""
    url = f"{base_url.rstrip('/')}/chat/completions"
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "temperature": 0.3,
    }).encode("utf-8")

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        eprint(f"HTTP {e.code}: {body}")
        print(f"[MurmurClip] API error {e.code}: {body[:200]}", end="")
        sys.exit(1)
    except Exception as e:
        eprint(f"Request error: {e}")
        print(f"[MurmurClip] Request failed: {e}", end="")
        sys.exit(1)


def call_anthropic(base_url, api_key, model, system, user):
    """POST to the Anthropic /v1/messages endpoint."""
    url = f"{base_url.rstrip('/')}/messages"
    payload = json.dumps({
        "model": model,
        "max_tokens": 4096,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            texts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
            return "".join(texts).strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        eprint(f"HTTP {e.code}: {body}")
        print(f"[MurmurClip] Anthropic error {e.code}: {body[:200]}", end="")
        sys.exit(1)
    except Exception as e:
        eprint(f"Request error: {e}")
        print(f"[MurmurClip] Request failed: {e}", end="")
        sys.exit(1)


def call_ollama(base_url, model, system, user):
    """POST to the Ollama /api/chat endpoint (no API key required)."""
    url = f"{base_url.rstrip('/')}/api/chat"
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "stream": False,
        "options": {"temperature": 0.3},
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload,
                                 headers={"Content-Type": "application/json"},
                                 method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        eprint(f"HTTP {e.code}: {body}")
        print(f"[MurmurClip] Ollama error {e.code}: {body[:200]}", end="")
        sys.exit(1)
    except Exception as e:
        eprint(f"Request error: {e}")
        print(f"[MurmurClip] Ollama failed: {e}. Is Ollama running?", end="")
        sys.exit(1)


def translate_ai(text, mode, source_lang, target_lang,
                 provider, base_url, model, api_key, custom_prompt):
    """Dispatch the AI call to the configured provider."""
    defaults = PROVIDER_DEFAULTS.get(provider, PROVIDER_DEFAULTS["custom"])
    base_url = base_url or defaults["base_url"]
    model    = model    or defaults["model"]

    system, user = build_prompt(text, mode, source_lang, target_lang, custom_prompt)

    if provider == "anthropic":
        if not api_key:
            print("[MurmurClip] Anthropic API key required. Open MurmurClip settings.", end="")
            sys.exit(2)  # exit 2 → PopClip shows extension settings UI
        return call_anthropic(base_url, api_key, model, system, user)
    elif provider == "ollama":
        return call_ollama(base_url, model, system, user)
    else:  # openai or custom
        return call_openai_compatible(base_url, api_key, model, system, user)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    text = get_text()
    if not text:
        return

    mode          = get_opt("MODE",        "auto")
    source_lang   = get_opt("SOURCELANG",  "auto")
    target_lang   = get_opt("TARGETLANG",  "en")
    service       = get_opt("SERVICE",     "macos")
    provider      = get_opt("AIPROVIDER",  "openai")
    base_url      = get_opt("AIBASEURL",   "")
    model         = get_opt("AIMODEL",     "")
    api_key       = get_opt("AIAPIKEY",    "")
    custom_prompt = get_opt("AIPROMPT",    "")

    # Resolve auto-detect
    if source_lang == "auto":
        source_lang = detect_language(text)

    # Auto mode: polish if same language, translate otherwise
    if mode == "auto":
        mode = "polish" if source_lang == target_lang else "translate"

    if service == "macos":
        result = translate_macos(text, source_lang, target_lang)
    else:
        result = translate_ai(text, mode, source_lang, target_lang,
                              provider, base_url, model, api_key, custom_prompt)

    print(result, end="")  # stdout → PopClip "after" step


if __name__ == "__main__":
    main()
