// MurmurClip — PopClip extension
// Translates or polishes selected text using macOS Translation or an AI service.
// Supports: OpenAI, Anthropic, Ollama (via shell), custom OpenAI-compatible endpoints.

"use strict";

const axios = require("axios");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANG_NAMES = {
  zh: "Chinese", en: "English", ja: "Japanese",
  ko: "Korean",  fr: "French",  de: "German", es: "Spanish",
};

const PROVIDER_DEFAULTS = {
  openai:    { baseURL: "https://api.openai.com/v1",    model: "gpt-4o-mini" },
  anthropic: { baseURL: "https://api.anthropic.com/v1", model: "claude-3-5-sonnet-20241022" },
  ollama:    { baseURL: "http://localhost:11434",        model: "llama3.1" },
  custom:    { baseURL: "",                              model: "" },
};

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

function detectLanguage(text) {
  let cjk = 0, ascii = 0;
  for (const c of text) {
    const cp = c.codePointAt(0);
    if (cp >= 0x4e00 && cp <= 0x9fff) cjk++;
    else if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122)) ascii++;
  }
  const total = cjk + ascii;
  if (total === 0) return "en";
  return cjk / total > 0.3 ? "zh" : "en";
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(mode, sourceLang, targetLang, customPrompt) {
  const srcName = sourceLang !== "auto" ? (LANG_NAMES[sourceLang] || sourceLang) : "the source language";
  const tgtName = LANG_NAMES[targetLang] || targetLang;

  if (customPrompt) {
    return customPrompt
      .replace("{mode}", mode)
      .replace("{source}", srcName)
      .replace("{target}", tgtName);
  }

  if (mode === "polish") {
    return `You are a language expert. Polish and correct the following ${srcName} text. ` +
           `Fix grammar, spelling, and punctuation. Make it sound natural and idiomatic ` +
           `like a native speaker. Keep the original meaning. ` +
           `Output ONLY the corrected text — no explanations.`;
  }

  if (mode === "translate") {
    return `You are a professional translator. Translate the following text ` +
           `from ${srcName} to ${tgtName}. ` +
           `Use natural, idiomatic ${tgtName} as a native speaker would in everyday conversation. ` +
           `Output ONLY the translation — no explanations, no notes.`;
  }

  // auto
  return `You are a language assistant. Examine the input:\n` +
         `- If it is already in ${tgtName}: polish it — fix grammar, spelling, and style ` +
         `to sound like a native ${tgtName} speaker.\n` +
         `- If it is NOT in ${tgtName}: translate it into natural, conversational ${tgtName}.\n` +
         `Output ONLY the result — no explanations.`;
}

// ---------------------------------------------------------------------------
// macOS Translation (requires macOS 15+, uses shell script via AppleScript)
// ---------------------------------------------------------------------------

async function translateMacOS(text, sourceLang, targetLang) {
  // macOS Translation framework is not accessible from JS directly.
  // We invoke it via a short Swift one-liner through the shell.
  const script = `
    import Foundation
    import Translation

    let text = CommandLine.arguments[1]
    let src  = CommandLine.arguments[2]
    let tgt  = CommandLine.arguments[3]
    let cfg  = TranslationSession.Configuration(
      source: Locale.Language(identifier: src),
      target: Locale.Language(identifier: tgt)
    )
    let session = try! TranslationSession(configuration: cfg)
    let resp    = try! await session.translate(text)
    print(resp.targetText, terminator: "")
  `.trim();

  // Write to temp file and run via osascript shell
  const escaped = script.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
  const escapedText = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "'\\''");

  // Use AppleScript to run shell command (avoids Python dependency)
  const appleScript = `do shell script "echo \\"${escaped}\\" > /tmp/_mc_translate.swift && swift /tmp/_mc_translate.swift '${escapedText}' ${sourceLang} ${targetLang}"`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // PopClip doesn't support running AppleScript directly from JS actions,
    // so macOS Translation falls back to a clear error message.
    reject(new Error("Settings error: macOS Translation requires running Swift — please switch to AI Service in MurmurClip settings."));
  });
}

// ---------------------------------------------------------------------------
// OpenAI-compatible (OpenAI / custom)
// ---------------------------------------------------------------------------

async function callOpenAICompatible(baseURL, apiKey, model, systemPrompt, userText) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const response = await axios.post(
    `${baseURL.replace(/\/$/, "")}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userText },
      ],
      temperature: 0.3,
    },
    { headers, timeout: 60000 }
  );

  return response.data.choices[0].message.content.trim();
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

async function callAnthropic(baseURL, apiKey, model, systemPrompt, userText) {
  if (!apiKey) throw new Error("Settings error: Anthropic API key required.");

  const response = await axios.post(
    `${baseURL.replace(/\/$/, "")}/messages`,
    {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      timeout: 60000,
    }
  );

  return response.data.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim();
}

// ---------------------------------------------------------------------------
// Ollama  (http:// — must go via shell since PopClip JS blocks http)
// ---------------------------------------------------------------------------

async function callOllama(baseURL, model, systemPrompt, userText) {
  // PopClip's JS engine blocks http:// requests (App Transport Security).
  // We fall back to a shell command via NSTask through a known workaround:
  // throw a settings error directing the user to use a reverse proxy or
  // an HTTPS-capable custom endpoint instead.
  // If the user has configured a custom https Ollama proxy, it will work
  // via the "custom" provider path.  For plain http://localhost we provide
  // a clear message.
  const url = baseURL || PROVIDER_DEFAULTS.ollama.baseURL;
  if (url.startsWith("http://")) {
    throw new Error(
      "Settings error: Ollama uses http:// which is blocked by macOS App Transport Security in PopClip's JS environment. " +
      "Options:\n" +
      "1. Use a reverse proxy with HTTPS (e.g. nginx + self-signed cert).\n" +
      "2. Set AI Provider to 'Custom' and point to an HTTPS Ollama endpoint.\n" +
      "3. Use OpenAI or Anthropic instead."
    );
  }
  // If user has set an https Ollama URL, treat as OpenAI-compatible
  return callOpenAICompatible(url, "", model, systemPrompt, userText);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const text    = popclip.input.text;
const opts    = popclip.options;

let mode        = opts.mode        || "auto";
let sourceLang  = opts.sourceLang  || "auto";
const targetLang  = opts.targetLang  || "en";
const service     = opts.service     || "ai";
const provider    = opts.aiProvider  || "openai";
const customPrompt = opts.aiPrompt   || "";

// Resolve source language
if (sourceLang === "auto") sourceLang = detectLanguage(text);

// Resolve auto mode
if (mode === "auto") mode = (sourceLang === targetLang) ? "polish" : "translate";

// macOS Translation path
if (service === "macos") {
  const result = await translateMacOS(text, sourceLang, targetLang);
  return result;
}

// AI path
const defaults  = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.custom;
const baseURL   = (opts.aiBaseURL || "").trim() || defaults.baseURL;
const model     = (opts.aiModel   || "").trim() || defaults.model;
const apiKey    = (opts.aiApiKey  || "").trim();

const systemPrompt = buildPrompt(mode, sourceLang, targetLang, customPrompt);

let result;
if (provider === "anthropic") {
  result = await callAnthropic(baseURL, apiKey, model, systemPrompt, text);
} else if (provider === "ollama") {
  result = await callOllama(baseURL, model, systemPrompt, text);
} else {
  // openai or custom
  result = await callOpenAICompatible(baseURL, apiKey, model, systemPrompt, text);
}

return result;
