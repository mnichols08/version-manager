# pre-release.js

A utility script that stages files typically modified during a release process.

## Purpose

This script helps prepare your repository for a release by staging files that are commonly modified during version bumps and releases. It only stages files that have actual changes in the git working tree.

## Files Managed

The script monitors and stages these files when they have changes:
- `package.json` - Version and metadata updates
- `package-lock.json` - Dependency lock file updates
- `CHANGELOG.md` - Release notes and change history
- `src/sw.js` - Service worker with version updates (if exists)
- `src/index.html` - Main HTML with cache-busting updates (if exists)
- `src/offline.html` - Offline page with version updates (if exists)

## Usage

```bash
npm run pre-release [options]
```

Or directly:
```bash
node scripts/pre-release.js [options]
```

## Options

- `--dry` - Show what would be staged without actually staging files
- `--all` - Stage all release-related files even if they haven't changed

## Examples

```bash
# Stage only modified release files (default behavior)
npm run pre-release

# Preview what would be staged
npm run pre-release -- --dry

# Stage all release files regardless of changes
npm run pre-release -- --all
```

## Workflow Integration

This script is typically used:
1. After running version bump scripts
2. Before creating release commits
3. As part of automated release pipelines
4. To ensure consistent staging of release-related files

## Output

The script will show:
- Which files were found and checked
- Which files had changes and were staged
- Which files were skipped (no changes or don't exist)