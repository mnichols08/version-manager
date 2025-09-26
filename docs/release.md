# release.js

The main release orchestration script that handles the complete release workflow.

## Purpose

This is the primary script for creating releases. It coordinates multiple release tasks in the correct order:

1. **Update README snapshots** – Runs `update-readmes.js` so documentation reflects the latest work
2. **Update CHANGELOG.md** – Generates changelog entries from git commits since the last tag
3. **Stage and commit docs** – Uses `pre-release.js` to stage release files and commits them as "docs: prepare release notes" (with a list of every staged file)
4. **Bump versions** – Calls `bump-sw.js` to update versions across project files, create the release commit, tag, and optionally push

## Usage

```bash
npm run release [options]
```

Or directly:
```bash
node scripts/release.js [options]
```

## Options

### Version Control
- `--major` - Create a major version release (X.0.0)
- `--minor` - Create a minor version release (X.Y.0)
- `--patch` - Create a patch version release (X.Y.Z) **[default]**

### Git Operations
- `--push` - Push the release commit and tags to remote repository
- `--force-tag` - Force create tag even if it already exists

### General
- `--dry` - Preview the release process without making actual changes

## Examples

```bash
# Create a patch release (default)
npm run release

# Create a minor version release
npm run release -- --minor

# Create a major version release and push to remote
npm run release -- --major --push

# Preview what a release would do
npm run release -- --dry --minor
```

## Workflow Steps

1. **README Refresh**: `update-readmes.js --since-tag` injects the latest highlights into `README.md`
2. **Changelog Generation**: Updates `CHANGELOG.md` with commits since the last git tag
3. **Documentation Commit**:
   - `pre-release.js` stages release-related files (including READMEs)
   - The script commits staged docs as `docs: prepare release notes`
4. **Version Bumping**: Updates versions in:
   - `package.json`
   - `package-lock.json` 
   - Service worker files
   - HTML files (cache-busting)
5. **Git Operations** (handled by `bump-sw.js`):
   - Creates the release commit & tag
   - Optionally pushes to remote (with `--push`)

## Integration

This script internally calls:
- `update-readmes.js` – For README context generation
- `update-changelog.js` – For changelog generation
- `pre-release.js` – For staging documentation prior to committing
- `bump-sw.js` – For version bumping across files

## Best Practices

- Run `npm run release -- --dry` first to preview changes
- Use semantic versioning: `--patch` for bug fixes, `--minor` for features, `--major` for breaking changes
- Add `--push` when ready to publish the release to your remote repository
- Start with a clean working tree; the script stages and commits documentation changes on your behalf before handing off to `bump-sw.js`
- If you maintain multiple README files, consider running `npm run update-readmes -- --all` ahead of time to verify all summaries look correct