# bump-sw.js

A comprehensive version bumping script that updates versions across multiple files in your project.

## Purpose

This script automatically updates version numbers in:
- Service Worker (`sw.js`): Updates `CACHE_VERSION` variable
- HTML files: Updates cache-busting query parameters (`?v=X.Y.Z`) in `index.html` and `offline.html`
- `package.json`: Updates the version field
- `package-lock.json`: Updates version and packages[""]?.version

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
- `--no-git` - Disable git operations (tagging disabled)
- `--no-commit` - Skip creating release commit
- `--force-tag` - Force create tag even if it exists
- `--push` - Push tags and commits to remote

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

- Creates a git tag by default (use `--no-git` to disable)
- Creates a release commit by default (use `--no-commit` to skip)
- Uses patch version increment if no version type specified
- Preserves version prefix format in service worker files