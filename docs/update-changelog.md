# update-changelog.js

A script that automatically generates and updates changelog entries based on git commit history.

## Purpose

This script analyzes git commits since the last tag and generates structured changelog entries. It helps maintain consistent release documentation by automatically extracting commit information and organizing it in a standardized format.

## Usage

```bash
npm run update-changelog [options]
```

Or directly:
```bash
node scripts/update-changelog.js [options]
```

## Options

### Version Control
- `--major` - Prepare changelog for major version release (X.0.0)
- `--minor` - Prepare changelog for minor version release (X.Y.0)
- `--patch` - Prepare changelog for patch version release (X.Y.Z) **[default]**

### General
- `--dry` - Preview changelog changes without updating the file

## Examples

```bash
# Update changelog for patch release (default)
npm run update-changelog

# Update changelog for minor release
npm run update-changelog -- --minor

# Preview changelog changes without saving
npm run update-changelog -- --dry --minor
```

## Functionality

### Commit Analysis
- Identifies all commits since the last git tag
- Extracts commit messages and metadata
- Organizes commits by type or category

### Changelog Generation
- Creates properly formatted changelog entries
- Includes version numbers and dates
- Maintains consistent formatting with existing changelog

### Version Calculation
- Determines the next version number based on:
  - Current version in `package.json`
  - Specified bump type (`--major`, `--minor`, `--patch`)

## Output Format

The script generates changelog entries following standard conventions:
- Version headers with dates
- Categorized changes (if commit messages follow conventional format)
- Proper markdown formatting
- Links to commits or issues (when applicable)

## Integration

This script is typically used:
- As part of the release workflow (called by `release.js`)
- Before version bumping to document changes
- To maintain consistent release documentation
- In CI/CD pipelines for automated releases

## File Management

- Updates existing `CHANGELOG.md` file
- Preserves existing changelog entries
- Adds new entries at the top of the file
- Creates the file if it doesn't exist