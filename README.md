# Version Manager

Version Manager is a tool designed to help developers streamline versioning in a git repository.

## README Task Generator

Generate planning tasks for README updates with your local LM Studio instance:

1. Start LM Studio with the OpenAI-compatible server enabled (default `http://localhost:1234/v1`) and load the `openai/gpt-oss-20b` model.
2. From the project root, run:

```
npm run generate-readme-tasks
```

Optional flags:

- `--skip-llm` — create the context bundle without calling LM Studio.
- `--limit-commits <N>` — change how many recent commits are included (default 10).
- `--base-url <url>` and `--model <name>` — override LM Studio connection details.

Each run writes a timestamped folder in `tmp/lm-studio-tasks/` containing:

- `context.md` — git history, status, diffs, and README previews.
- `prompt.txt` — the system + user prompts sent to LM Studio.
- `tasks.json` — the model’s suggested GitHub Copilot tasks (or error details if the call fails).
- `lm-response.json` — full raw response when the call succeeds.

More details live in [`docs/generate-readme-tasks.md`](docs/generate-readme-tasks.md).

### Convert tasks for GitHub Copilot

Turn the generated JSON tasks into Copilot-ready prompts:

```
npm run prepare-copilot-prompts [-- --tasks tmp/lm-studio-tasks/<run-id>/tasks.json]
```

If you omit `--tasks`, the script uses the most recent run under `tmp/lm-studio-tasks/`.

You’ll get two files alongside the original `tasks.json`:

- `copilot-prompts.md` — copy/paste each fenced block into GitHub Copilot Chat.
- `copilot-prompts.json` — structured prompts for the Copilot CLI (`npx @githubnext/copilot-cli chat --prompt "<prompt>"`).

Full reference: [`docs/prepare-copilot-prompts.md`](docs/prepare-copilot-prompts.md).

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

## License

This project is licensed under the MIT License.