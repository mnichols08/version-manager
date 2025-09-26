#!/usr/bin/env node
'use strict';
/**
 * release.js
 *
 * Updated release workflow:
 * 1. Refresh README snapshots using recent commit history.
 * 2. Regenerate CHANGELOG.md for the upcoming version bump.
 * 3. Stage and commit documentation updates via pre-release.
 * 4. Delegate version bumping, tagging, and optional pushing to bump-sw.js.
 *
 * Usage:
 *   node scripts/release.js [--patch|--minor|--major] [--dry] [--push] [--force-tag]
 */

const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);

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

function tryExecCapture(cmd) {
  try {
    return cp
      .execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
  } catch (_error) {
    return '';
  }
}

function getStagedFiles() {
  const output = tryExecCapture('git diff --cached --name-only');
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean);
}

function runScript(parts) {
  const command = parts.filter(Boolean).join(' ');
  exec(command);
}

function main() {
  console.log('=== Release script starting ===');

  const updateReadmesArgs = ['node', 'scripts/update-readmes.js'];
  if (DRY) updateReadmesArgs.push('--dry');
  updateReadmesArgs.push('--since-tag');
  runScript(updateReadmesArgs);

  const updateChangelogArgs = ['node', 'scripts/update-changelog.js', bumpType];
  if (DRY) updateChangelogArgs.push('--dry');
  runScript(updateChangelogArgs);

  if (DRY) {
    console.log('Pre-release staging (dry-run preview):');
    runScript(['node', 'scripts/pre-release.js', '--dry']);
  } else {
    console.log('Staging documentation changes via pre-release...');
    runScript(['node', 'scripts/pre-release.js']);

    const stagedFiles = getStagedFiles();
    if (stagedFiles.length) {
      console.log('Staged files ready for documentation commit:');
      stagedFiles.forEach((file) => console.log(`  - ${file}`));
      console.log('Creating documentation prep commit...');
      runScript(['git', 'commit', '-m', '"docs: prepare release notes"']);
    } else {
      console.log('No staged documentation changes detected; skipping docs commit.');
    }
  }

  const bumpCommand = ['node', 'scripts/bump-sw.js', bumpType];
  if (DRY) bumpCommand.push('--dry');
  if (PUSH) bumpCommand.push('--push');
  if (FORCE) bumpCommand.push('--force-tag');
  runScript(bumpCommand);

  if (!DRY) {
    const remaining = tryExecCapture('git status --porcelain');
    if (remaining) {
      console.log('Remaining working tree changes after release flow:');
      remaining
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => console.log(`  ${line}`));
    }
  }

  console.log('=== Release script done ===');
}

try {
  main();
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
