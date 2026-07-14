# Contributing to MurmurClip

Thank you for your interest in contributing! Here's how to get involved.

## Reporting Issues

- Search [existing issues](https://github.com/silentcloud/MurmurClip/issues) first.
- Include your macOS version, PopClip version, and a clear description of the problem.
- For AI-related issues, note the provider and model you are using.

## Suggesting Features

Open an issue with the `enhancement` label and describe the use case. Keep suggestions scoped and focused.

## Submitting Pull Requests

1. Fork the repository and create a branch from `main`.
2. Make your changes inside `MurmurClip.popclipext/`.
3. Test manually:
   ```bash
   # Simulate PopClip environment variables
   export POPCLIP_TEXT="Your test text here"
   export POPCLIP_OPTION_MODE="auto"
   export POPCLIP_OPTION_SOURCELANG="auto"
   export POPCLIP_OPTION_TARGETLANG="en"
   export POPCLIP_OPTION_SERVICE="ai"
   export POPCLIP_OPTION_AIPROVIDER="openai"
   export POPCLIP_OPTION_AIAPIKEY="sk-..."
   python3 MurmurClip.popclipext/murmurclip.py
   ```
4. Verify `Config.json` is valid JSON:
   ```bash
   python3 -m json.tool MurmurClip.popclipext/Config.json > /dev/null
   ```
5. Open a pull request with a clear description of what changed and why.

## Code Style

- Python: follow [PEP 8](https://pep8.org/). Keep functions small and purposeful.
- JSON: use 2-space indentation. Keep option identifiers in camelCase.
- No external dependencies — the script must run with Python's standard library only.

## Adding a New AI Provider

1. Add a new entry to `PROVIDER_DEFAULTS` in `murmurclip.py`.
2. Add the corresponding option value to `Config.json` under the `aiProvider` option.
3. Implement a `call_<provider>()` function following the pattern of the existing ones.
4. Route to it in `translate_ai()`.
5. Update the README and CHANGELOG.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
