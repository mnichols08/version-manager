# update-readmes.js

Automatically create or refresh README files with summaries of your latest work.

## Purpose

The `update-readmes` script builds on the context gathering approach from
`generate-readme-tasks`. It pulls recent git activity, distills it into a short
story, and injects a "Recent Updates" section into your README files so they
stay aligned with the changelog and release notes.

## Usage

```bash
npm run update-readmes [-- <options>]
```

Or call the script directly:

```bash
node scripts/update-readmes.js [options]
```

## Options

| Flag | Description | Default |
| --- | --- | --- |
| `--dry` | Preview changes without writing to disk. | Disabled |
| `--limit <N>` | Number of highlight commits to include. | `5` |
| `--since-tag` | Only consider commits after the latest git tag. | Disabled |
| `--target <path>` | Update or create a specific README file. | Root `README.md` |
| `--all` | Scan the repository for every `README.md` file. | Disabled |
| `--no-files` | Hide file impact summaries in highlight bullets. | Files included |
| `--with-author` | Append commit authors to highlight bullets. | Disabled |
| `--no-create` | Skip creating missing README files. | Creates when missing |

## What it does

- Gathers commit metadata (type, scope, summary, impacted files).
- Builds a concise summary that mirrors the changelog story.
- Highlights the most relevant commits with links and optional authors.
- Updates an existing README section between `<!-- recent-updates:start -->`
  and `<!-- recent-updates:end -->`, or inserts a new section near the top.
- Creates a new README from a template if one is missing (unless `--no-create`).

## Tips

- Pair this with `npm run update-changelog` for synchronized release notes.
- Run with `--dry` when experimenting to see the generated content first.
- Use `--since-tag` in release workflows to align with tagged versions.
- When the script runs inside `release.js`, it automatically scopes to commits after the latest tag and feeds the results into the changelog step.

## Troubleshooting

- **No commits detected**: ensure you have local commits or remove `--since-tag`.
- **Missing README**: allow the script to create it, or point `--target` to the
  correct location.
- **Unwanted folders scanned**: use `--target` or avoid `--all` to stay focused.
- **Generated section looks stale**: rerun with a larger `--limit` or without `--since-tag` to capture a broader history, then commit the refreshed output.
