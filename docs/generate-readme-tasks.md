# generate-readme-tasks.js

Collect git and documentation context, package it for local LM Studio, and optionally request README-focused task ideas.

## Purpose

This script automates the "what changed?" step before you rewrite documentation:

- Captures commit history, current status, and recent diffs.
- Finds existing README files and embeds previews for quick reference.
- Stores everything in a timestamped folder under `tmp/lm-studio-tasks/`.
- Optionally calls a local LM Studio instance (OpenAI-compatible) to turn the context into actionable tasks.

## Prerequisites

- Node.js 18+
- Git repository with history to analyze
- (Optional) LM Studio running in OpenAI-compatible server mode
- (Optional) The `openai/gpt-oss-20b` model loaded in LM Studio

## Usage

### npm script (recommended)

```bash
npm run generate-readme-tasks [-- <options>]
```

### direct invocation

```bash
node scripts/generate-readme-tasks.js [options]
```

## Options

| Flag | Description | Default |
| --- | --- | --- |
| `--skip-llm` | Only gather context; skip calling LM Studio. | Disabled |
| `--limit-commits <N>` | Number of commits to include in the summary. | `10` |
| `--model <name>` | LM Studio model identifier to request. | `openai/gpt-oss-20b` |
| `--base-url <url>` | Base URL for the LM Studio server (OpenAI-compatible). | `http://localhost:1234/v1` |

You can also set environment variables to avoid long command lines:

- `LM_STUDIO_MODEL`
- `LM_STUDIO_URL`
- `CONTEXT_COMMIT_LIMIT`
- `SKIP_LM_STUDIO`

## Output files

Each run generates a folder: `tmp/lm-studio-tasks/<timestamp-id>/` containing:

- `context.md` – aggregated git metadata, diffs, and README previews.
- `meta.json` – metadata about the run (hostname, options used).
- `prompt.txt` – the exact prompt sent to LM Studio (system + user message).
- `tasks.json` – generated tasks (clean JSON) or an error message.
- `lm-response.json` – raw LM Studio response payload (when available).
- `lm-error.log` – captured error text if the request fails.

You can review `tasks.json` directly to triage suggested README updates or copy individual
ideas into GitHub Copilot Chat. The dedicated Copilot prompt conversion script has been
retired, so all post-processing happens manually now.

## Examples

```bash
# Dry run without hitting LM Studio
npm run generate-readme-tasks -- --skip-llm

# Capture 20 commits and point to a custom LM Studio endpoint
npm run generate-readme-tasks -- --limit-commits 20 --base-url http://localhost:9000/v1

# Use a different model by environment variable
set LM_STUDIO_MODEL=openai/gpt-oss-8b
npm run generate-readme-tasks
```

## Troubleshooting

- **Unexpected endpoint error**: ensure the base URL includes the `/v1` path (e.g., `http://localhost:1234/v1`).
- **Empty tasks**: confirm LM Studio is running, the model is loaded, and the request is not skipped.
- **Old context reused**: remove or ignore previous folders; the script always creates a new run directory.
- **Model takes too long**: use `--skip-llm` to capture context only, then inspect `context.md` and
	`tasks.json` yourself for planning.
