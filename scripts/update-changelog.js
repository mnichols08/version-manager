#!/usr/bin/env node
/**
 * update-changelog.js
 *
 * Updates CHANGELOG.md with commits since the last tag.
 * 
 * Usage:
 *   node scripts/update-changelog.js [--patch|--minor|--major] [--dry]
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const changelogPath = path.join(root, 'CHANGELOG.md');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const DRY = has('--dry');

// Default bump type = patch
let bumpType = 'patch';
if (has('--major')) bumpType = 'major';
else if (has('--minor')) bumpType = 'minor';

function execCapture(cmd) {
  try {
    return cp.execSync(cmd, { cwd: root, stdio: 'pipe' }).toString().trim();
  } catch (e) {
    return '';
  }
}

function getCurrentVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

function getNextVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    default: // patch
      return `${major}.${minor}.${patch + 1}`;
  }
}

function getLastTag() {
  const tag = execCapture('git describe --tags --abbrev=0');
  return tag || null;
}

function getCommitsSinceTag(tag) {
  const cmd = tag 
    ? `git log ${tag}..HEAD --oneline --no-merges`
    : 'git log --oneline --no-merges';
  
  const output = execCapture(cmd);
  return output ? output.split('\n').filter(line => line.trim()) : [];
}

function formatChangelogEntry(version, commits) {
  const date = new Date().toISOString().split('T')[0];
  let entry = `\n## [${version}] - ${date}\n\n`;
  
  if (commits.length === 0) {
    entry += '- Initial release\n';
  } else {
    commits.forEach(commit => {
      // Remove commit hash and format
      const message = commit.replace(/^[a-f0-9]{7,}\s*/, '');
      entry += `- ${message}\n`;
    });
  }
  
  return entry;
}

function updateChangelog(version, commits) {
  const entry = formatChangelogEntry(version, commits);
  
  if (!fs.existsSync(changelogPath)) {
    // Create new changelog
    const content = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n${entry}`;
    if (!DRY) {
      fs.writeFileSync(changelogPath, content);
      console.log(`Created CHANGELOG.md with version ${version}`);
    } else {
      console.log(`[dry] Would create CHANGELOG.md with version ${version}`);
    }
  } else {
    // Update existing changelog
    const existing = fs.readFileSync(changelogPath, 'utf8');
    const lines = existing.split('\n');
    
    // Find where to insert (after the header, before first ## entry)
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) {
        insertIndex = i;
        break;
      }
    }
    
    if (insertIndex === 0) {
      // No existing entries, add after header
      insertIndex = lines.findIndex(line => line.toLowerCase().includes('changelog')) + 1;
      if (insertIndex === 0) insertIndex = lines.length;
    }
    
    lines.splice(insertIndex, 0, ...entry.split('\n'));
    const newContent = lines.join('\n');
    
    if (!DRY) {
      fs.writeFileSync(changelogPath, newContent);
      console.log(`Updated CHANGELOG.md with version ${version}`);
    } else {
      console.log(`[dry] Would update CHANGELOG.md with version ${version}`);
    }
  }
}

function main() {
  // Check if we're in a git repository
  try {
    execCapture('git rev-parse --is-inside-work-tree');
  } catch {
    console.warn('Not a git repository; skipping changelog update.');
    return;
  }

  const currentVersion = getCurrentVersion();
  const nextVersion = getNextVersion(currentVersion, bumpType);
  const lastTag = getLastTag();
  const commits = getCommitsSinceTag(lastTag);
  
  console.log(`Updating changelog: ${currentVersion} -> ${nextVersion}`);
  console.log(`Found ${commits.length} commits since ${lastTag || 'beginning'}`);
  
  if (DRY) {
    console.log('[dry] Commits to include:');
    commits.forEach(commit => console.log(`  - ${commit}`));
  }
  
  updateChangelog(nextVersion, commits);
}

try {
  main();
} catch (e) {
  console.error(`Error updating changelog: ${e.message || String(e)}`);
  process.exit(1);
}