# prepare-copilot-prompts.js

Transform generated LM Studio tasks into prompts tailored for GitHub Copilot Chat or the Copilot CLI.

## Purpose

- Reads the `tasks.json` produced by `generate-readme-tasks.js`.
- Generates polished prompts that Copilot can consume without further editing.
- Outputs both Markdown (easy copy/paste) and JSON (automation-friendly) formats.

## Usage

### npm script

```bash
npm run prepare-copilot-prompts [-- <options>]
```

### direct invocation

```bash
node scripts/prepare-copilot-prompts.js [options]
```

## Options

| Flag | Description | Default |
| --- | --- | --- |
| `--tasks <path>` | Explicit path to a `tasks.json` file. Relative paths resolve from repo root. | Most recent run in `tmp/lm-studio-tasks/` |

## Output files

The script writes the new files next to the chosen `tasks.json`:

- `copilot-prompts.md` – Markdown headings with fenced prompt blocks for Copilot Chat.
- `copilot-prompts.json` – Array of `{ id, title, prompt }` entries.

## Workflow

1. Run `npm run generate-readme-tasks` to refresh LM Studio output.
2. Run `npm run prepare-copilot-prompts`.
3. Open the produced Markdown or JSON and feed the desired prompt to Copilot.

### Copilot Chat

Copy a fenced block from `copilot-prompts.md` and paste it into Copilot Chat inside VS Code.

### Copilot CLI (optional)

```bash
npx @githubnext/copilot-cli chat --prompt "$(jq -r '.[0].prompt' copilot-prompts.json)"
```

Adjust the `jq` filter to pick a specific task.

## Notes

- Prompts include task goals, acceptance criteria, target artifacts, and execution tips.
- If the source `tasks.json` lacks fields, the script fills in safe defaults to keep prompts usable.
- The script fails fast when it cannot parse JSON—ensure the tasks generator completed successfully first.
