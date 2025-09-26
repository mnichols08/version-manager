# bump-sw.js

A comprehensive version bumping script that updates versions across multiple files in your project.

## Purpose

This script automatically updates version numbers in:
- Service worker (`sw.js`): updates the `CACHE_VERSION` variable when the file exists
- HTML entry points: refreshes cache-busting query parameters (`?v=X.Y.Z`) in `index.html` and `offline.html`
- `package.json`: synchronizes the package version
- `package-lock.json`: aligns the top-level version and `packages[""]?.version` when present

## Usage

```bash
npm run bump-sw [options]
```

Or directly:
```bash
node scripts/bump-sw.js [options]
```

## Options

### Version Control
- `--set X.Y.Z` or `--set vX.Y.Z` - Set explicit version number
- `--major` - Bump major version (X.0.0)
- `--minor` - Bump minor version (X.Y.0)
- `--patch` - Bump patch version (X.Y.Z) **[default]**

### Git Operations
- `--no-git` - Disable git operations (skip tagging and pushing)
- `--no-commit` - Skip creating the release commit before tagging
- `--force-tag` - Overwrite an existing tag of the same name
- `--push` - Push release commit(s) and tags to the remote

### General
- `--dry` - Show what would be changed without making actual changes

## Examples

```bash
# Bump patch version (default behavior)
npm run bump-sw

# Bump minor version
npm run bump-sw -- --minor

# Set specific version
npm run bump-sw -- --set 2.1.0

# Dry run to preview changes
npm run bump-sw -- --dry --minor

# Bump version and push to remote
npm run bump-sw -- --minor --push
```

## Default Behavior

- Detects whether the service worker or HTML files exist and skips them gracefully if they do not
- Creates a release commit and annotated tag unless you opt out (`--no-commit`, `--no-git`)
- Uses a patch bump when you do not specify `--major`, `--minor`, or `--set`
- Preserves any leading `v` prefix present in existing version strings
- When `--push` is provided, pushes both the commit and tag to the configured remote

`bump-sw.js` is the final step of the release pipeline. It assumes the README and changelog have
already been updated and staged, which is handled automatically by `release.js`.