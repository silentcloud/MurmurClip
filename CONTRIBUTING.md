# Contributing to MurmurClip

Thank you for your interest in contributing!

## Reporting Issues

- Search [existing issues](https://github.com/silentcloud/MurmurClip/issues) before opening a new one.
- Include your macOS version, PopClip version, translation service, and model name.
- If possible, include the selected text and the unexpected output or error message.

## Suggesting Features

Open an issue with the `enhancement` label. Describe the use case concisely.

## Submitting Pull Requests

1. Fork the repository and create a branch from `main`.
2. Make your changes inside `MurmurClip.popclipext/`.
3. Test locally using PopClip's test harness:
   ```bash
   /Applications/PopClip.app/Contents/MacOS/PopClip run MurmurClip.popclipext/murmurclip.js
   ```
   Or simulate the environment by temporarily hard-coding `popclip.input.text` and `popclip.options` at the top of the script for a quick sanity check.
4. Validate `Config.json`:
   ```bash
   python3 -m json.tool MurmurClip.popclipext/Config.json > /dev/null && echo "OK"
   ```
5. Check JS syntax:
   ```bash
   node -e "
     const fs = require('fs');
     const src = fs.readFileSync('MurmurClip.popclipext/murmurclip.js', 'utf8');
     const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
     new AsyncFunction(src);
     console.log('Syntax OK');
   "
   ```
6. Open a pull request with a clear description of what changed and why.

## Code Style

- **JavaScript**: plain ES2018, no build step, no `import`/`export`. Keep functions small and named clearly.
- **JSON**: 2-space indentation. Option identifiers in `camelCase`.
- **No external dependencies** — the script must run entirely within PopClip's built-in JS engine using only `XMLHttpRequest` and standard built-ins.
- **No `"use strict"`** — unnecessary inside PopClip's async wrapper and can cause subtle issues.

## Adding a New AI Provider

1. Add a branch in `main()` in `murmurclip.js` for the new service identifier.
2. Implement a `translateWith<Name>()` function following the pattern of the existing ones.
3. Add the `getDefaultBaseUrl()` case for the new service.
4. Add the new value and label to the `translationService` option in `Config.json` (both `en` and `zh-hans` labels).
5. Update `README.md` with setup instructions and `CHANGELOG.md` with the change.

## Error Handling

- Use `popclip.showText("❌ " + error.message)` for user-facing errors — this shows a brief message in the PopClip bar without opening the settings dialog.
- Do **not** throw errors with messages starting with `"Settings error"` or `"not signed in"` unless you explicitly want PopClip to open the settings UI.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
