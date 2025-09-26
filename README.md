# Version Manager

Version Manager is a tool designed to help developers streamline versioning in a git repository.

<!-- recent-updates:start -->
## Recent Updates

> _Last updated: 2025-09-26T01:00:59.941Z_

- This release includes 5 features.
- Primary focus areas: the project root, `docs`, and `scripts`.
- Key files touched: `package.json`, `CHANGELOG.md`, and `README.md`.
- Documentation was refreshed to keep guides aligned with the latest behavior.

### Highlights

- add detailed documentation for README task generation and Copilot prompt preparation _(files: README.md, docs/generate-readme-tasks.md, docs/prepare-copilot-prompts.md)_ ([048437d](https://github.com/mnichols08/version-manager/commit/048437de4b94f2e0101bb93e5ab958230ed5e972))
- add scripts for release management and changelog updates _(files: scripts/bump-sw.js, scripts/pre-release.js, scripts/release.js, scripts/update-changelog.js)_ ([0d04993](https://github.com/mnichols08/version-manager/commit/0d04993cef3f583f09457c813163a181985592d5))
- update package.json description and enhance metadata _(files: package.json)_ ([2b73824](https://github.com/mnichols08/version-manager/commit/2b738247da9200df38829e13defb5d6079d71dd1))
- add scripts for generating README tasks and Copilot prompts _(files: .gitignore, README.md, package.json, scripts/generate-readme-tasks.js, scripts/prepare-copilot-prompts.js)_ ([2cc7b0b](https://github.com/mnichols08/version-manager/commit/2cc7b0b638f2fb170255b71b76c28fb6e54d86b7))
- add documentation for release management scripts _(files: docs/bump-sw.md, docs/pre-release.md, docs/release.md, docs/update-changelog.md)_ ([811c699](https://github.com/mnichols08/version-manager/commit/811c699480f1f7fa9acfb0330cc70f58c1f69d01))

<!-- recent-updates:end -->

## Changelog Automations

Generate a richer changelog narrative that automatically groups commits, surfaces highlights, and links back to their sources:

```
npm run update-changelog
```

- Builds a summary story for each release.
- Calls out breaking changes and documentation updates.
- Organizes entries by change type with commit links for quick triage.

More details live in [`docs/update-changelog.md`](docs/update-changelog.md).

## README Auto Updates

Keep README files aligned with the latest work using the same context pipeline that powers task generation:

```
npm run update-readmes [-- --limit 5 --since-tag]
```

- Inserts or refreshes a `Recent Updates` section with summaries and highlights.
- Works across all repository READMEs (`--all`) or a single target (`--target docs/README.md`).
- Supports dry runs, optional author attribution, and file impact details.

Usage reference: [`docs/update-readmes.md`](docs/update-readmes.md).

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

More details live in [`docs/generate-readme-tasks.md`](docs/generate-readme-tasks.md). Review the generated `tasks.json` directly to copy the highest-priority suggestions into GitHub Copilot Chat or your planning tool of choice.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

## License

This project is licensed under the MIT License.