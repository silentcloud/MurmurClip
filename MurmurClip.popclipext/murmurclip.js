// Murmur Translate - PopClip Extension
// Translates or corrects selected text using AI services (OpenAI / Ollama / Anthropic)

const LANGUAGE_NAMES = {
  zh: "Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish",
};

/**
 * Detect whether text is primarily Chinese or English
 */
function detectLanguage(text) {
  const chineseCharCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const totalAlphaCount = (text.replace(/\s/g, "").length) || 1;
  return chineseCharCount / totalAlphaCount > 0.3 ? "zh" : "en";
}

/**
 * Build the prompt based on source/target language and task type
 */
function buildPrompt(sourceLang, targetLang, text) {
  const isSameLanguage = sourceLang === targetLang;
  const sourceName = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;

  if (isSameLanguage && sourceLang === "en") {
    return "You are a native English editor. Correct the grammar and rephrase the following text into natural, conversational English. Keep the original meaning. Output ONLY the corrected text, nothing else.\n\nText: " + text;
  }

  if (isSameLanguage && sourceLang === "zh") {
    return "你是一位中文母语编辑。请纠正以下文本的语法，并将其改写为自然、口语化的中文表达。保持原意不变。只输出修改后的文本，不要任何额外内容。\n\n文本：" + text;
  }

  return "You are a professional translator. Translate the following " + sourceName + " text into natural, conversational " + targetName + ". Keep the original meaning and tone. Output ONLY the translated text, nothing else.\n\nText: " + text;
}

/**
 * HTTP POST using XMLHttpRequest (compatible with PopClip JS environment)
 */
function httpPost(url, headers, body) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    for (var key in headers) {
      if (headers.hasOwnProperty(key)) {
        xhr.setRequestHeader(key, headers[key]);
      }
    }
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error("HTTP " + xhr.status + ": " + xhr.responseText));
      }
    };
    xhr.onerror = function () {
      reject(new Error("Network error connecting to " + url));
    };
    xhr.send(body);
  });
}

/**
 * Call OpenAI-compatible API (works for OpenAI, Ollama, and other compatible services)
 */
async function translateWithOpenAICompatible(text, sourceLang, targetLang, apiKey, baseUrl, model) {
  var prompt = buildPrompt(sourceLang, targetLang, text);
  var headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = "Bearer " + apiKey;
  }

  var responseBody = await httpPost(
    baseUrl + "/chat/completions",
    headers,
    JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
    })
  );

  var data = JSON.parse(responseBody);
  var result = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return (result || "").trim();
}

/**
 * Call Anthropic Claude API
 */
async function translateWithAnthropic(text, sourceLang, targetLang, apiKey, baseUrl, model) {
  var prompt = buildPrompt(sourceLang, targetLang, text);

  var responseBody = await httpPost(
    baseUrl + "/messages",
    {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    JSON.stringify({
      model: model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })
  );

  var data = JSON.parse(responseBody);
  var result = data.content && data.content[0] && data.content[0].text;
  return (result || "").trim();
}

/**
 * Get the default base URL for each service
 */
function getDefaultBaseUrl(service) {
  if (service === "openai") return "https://api.openai.com/v1";
  if (service === "ollama") return "http://localhost:11434/v1";
  if (service === "anthropic") return "https://api.anthropic.com/v1";
  return "";
}

/**
 * Main entry point
 */
async function main() {
  var text = popclip.input.text.trim();
  if (!text) {
    popclip.showText("No text selected");
    return;
  }

  var options = popclip.options;
  var service = options.translationService || "openai";
  var sourceLang = options.sourceLanguage || "auto";
  var targetLang = options.targetLanguage || "en";

  // Auto-detect source language if set to auto
  if (sourceLang === "auto") {
    sourceLang = detectLanguage(text);
  }

  try {
    var result;

    if (service === "openai" || service === "ollama") {
      var baseUrl = options.apiBaseUrl || getDefaultBaseUrl(service);
      var apiKey = options.apiKey || "";
      var model = options.modelName || (service === "ollama" ? "llama3" : "gpt-4o-mini");
      result = await translateWithOpenAICompatible(text, sourceLang, targetLang, apiKey, baseUrl, model);
    } else if (service === "anthropic") {
      var anthropicBaseUrl = options.apiBaseUrl || getDefaultBaseUrl("anthropic");
      var anthropicApiKey = options.apiKey;
      if (!anthropicApiKey) {
        throw new Error("API Key is required for Anthropic. Please configure it in extension settings.");
      }
      var anthropicModel = options.modelName || "claude-sonnet-4-20250514";
      result = await translateWithAnthropic(text, sourceLang, targetLang, anthropicApiKey, anthropicBaseUrl, anthropicModel);
    } else {
      throw new Error("Unknown translation service: " + service);
    }

    if (!result) {
      throw new Error("Translation returned empty result");
    }

    return result;
  } catch (error) {
    popclip.showText("❌ " + error.message);
    return null;
  }
}

return main();
