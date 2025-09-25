#!/usr/bin/env node
/**
 * release.js
 *
 * Unified release workflow:
 * 1. Update CHANGELOG.md with commits since last tag.
 * 2. Run bump-sw-cache.js to bump version in sw.js, html, package.json, etc.
 * 3. Stage & commit CHANGELOG.md with release commit.
 *
 * Usage:
 *   node scripts/release.js [--patch|--minor|--major] [--dry] [--push] [--force-tag]
 */

const path = require('path');
const cp = require('child_process');
const fs = require('fs');

const root = path.join(__dirname, '..');
const changelogPath = path.join(root, 'CHANGELOG.md');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);

// Default bump type = patch
let bumpType = '--patch';
if (has('--major')) bumpType = '--major';
else if (has('--minor')) bumpType = '--minor';

const DRY = has('--dry');
const PUSH = has('--push');
const FORCE = has('--force-tag');

function exec(cmd, opts = { stdio: 'inherit' }) {
  console.log(`> ${cmd}`);
  return cp.execSync(cmd, { cwd: root, ...opts });
}

function execCapture(cmd) {
  return cp.execSync(cmd, { cwd: root }).toString().trim();
}

function fileChanged(file) {
  try {
    const diff = execCapture(`git status --porcelain "${file}"`);
    return diff.length > 0;
  } catch {
    return false;
  }
}

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return pkg.version;
}

function main() {
  console.log('=== Release script starting ===');

  // Step 0: Run pre-release to stage relevant files (if not dry run)
  if (!DRY) {
    console.log('Running pre-release to stage files...');
    exec('node scripts/pre-release.js');
  } else {
    console.log('Pre-release staging (dry-run preview):');
    exec('node scripts/pre-release.js --dry');
  }

  // Step 1: update changelog
  if (!DRY) {
    exec(`node scripts/update-changelog.js ${bumpType}`);
  } else {
    exec(`node scripts/update-changelog.js ${bumpType} --dry`);
  }

  const changelogWasChanged = !DRY && fs.existsSync(changelogPath) && fileChanged('CHANGELOG.md');
  if (changelogWasChanged) {
    exec('git add CHANGELOG.md');
  }

  // Step 2: bump sw/cache + package versions
  let bumpCmd = `node scripts/bump-sw.js ${bumpType}`;
  if (DRY) bumpCmd += ' --dry';
  if (PUSH) bumpCmd += ' --push';
  if (FORCE) bumpCmd += ' --force-tag';
  exec(bumpCmd);

  // Step 3: adjust commit message if changelog included
  if (!DRY && changelogWasChanged) {
    try {
      const version = getCurrentVersion();
      // Amend the last commit (created by bump-sw) to include changelog note
      exec(`git commit --amend -m "chore(release): bump to v${version}" -m "docs(changelog): update changelog"`);
      console.log('Amended release commit to include changelog update.');
    } catch (e) {
      console.warn('Could not amend commit with changelog note:', e.message);
    }
  }

  console.log('=== Release script done ===');
}

try {
  main();
} catch (e) {
  console.error(e.message || String(e));
  process.exit(1);
}
