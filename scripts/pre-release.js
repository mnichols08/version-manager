#!/usr/bin/env node
/**
 * pre-release.js
 *
 * Stages files that are typically modified during a release:
 * - package.json
 * - package-lock.json
 * - CHANGELOG.md
 * - src/sw.js (if exists)
 * - src/index.html (if exists)
 * - src/offline.html (if exists)
 *
 * Only stages files that have been modified (have changes in git working tree).
 *
 * Usage:
 *   node scripts/pre-release.js [--dry] [--all]
 *   
 * Options:
 *   --dry    Show what would be staged without actually staging
 *   --all    Stage all release-related files even if unchanged
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const DRY = has('--dry');
const ALL = has('--all');

// Files that are typically modified during releases
const RELEASE_FILES = [
  'package.json',
  'package-lock.json', 
  'CHANGELOG.md',
  'src/sw.js',
  'src/index.html',
  'src/offline.html'
];

function execCapture(cmd) {
  try {
    return cp.execSync(cmd, { cwd: root, stdio: 'pipe' }).toString().trim();
  } catch (e) {
    return '';
  }
}

function exec(cmd) {
  console.log(`> ${cmd}`);
  if (!DRY) {
    cp.execSync(cmd, { cwd: root, stdio: 'inherit' });
  }
}

function isGitRepo() {
  try {
    execCapture('git rev-parse --is-inside-work-tree');
    return true;
  } catch {
    return false;
  }
}

function fileExists(filePath) {
  return fs.existsSync(path.join(root, filePath));
}

function isFileModified(filePath) {
  const status = execCapture(`git status --porcelain "${filePath}"`);
  return status.length > 0;
}

function getModifiedFiles() {
  const status = execCapture('git status --porcelain');
  return status.split('\n')
    .filter(line => line.trim())
    .map(line => line.substring(3)); // Remove status indicators (e.g., " M ", "A  ")
}

function main() {
  if (!isGitRepo()) {
    console.error('Error: Not a git repository');
    process.exit(1);
  }

  console.log('=== Pre-release file staging ===');
  
  const existingFiles = RELEASE_FILES.filter(fileExists);
  const modifiedFiles = getModifiedFiles();
  
  console.log(`Found ${existingFiles.length} release-related files that exist`);
  console.log(`Found ${modifiedFiles.length} modified files in working tree`);
  
  let filesToStage = [];
  
  if (ALL) {
    // Stage all existing release files
    filesToStage = existingFiles;
    console.log('Staging all release-related files (--all mode)');
  } else {
    // Only stage files that are both release-related and modified
    filesToStage = existingFiles.filter(file => 
      isFileModified(file) || modifiedFiles.includes(file)
    );
    console.log('Staging only modified release-related files');
  }
  
  if (filesToStage.length === 0) {
    console.log('No files to stage');
    return;
  }
  
  console.log('\nFiles to stage:');
  filesToStage.forEach(file => {
    const status = isFileModified(file) ? '(modified)' : '(unchanged)';
    console.log(`  - ${file} ${status}`);
  });
  
  if (DRY) {
    console.log('\n[dry] Would run:');
    filesToStage.forEach(file => {
      console.log(`[dry]   git add "${file}"`);
    });
  } else {
    console.log('\nStaging files...');
    filesToStage.forEach(file => {
      try {
        exec(`git add "${file}"`);
        console.log(`  ✓ Staged ${file}`);
      } catch (e) {
        console.warn(`  ! Failed to stage ${file}: ${e.message}`);
      }
    });
    
    console.log('\nStaged files summary:');
    const staged = execCapture('git diff --cached --name-only').split('\n').filter(Boolean);
    staged.forEach(file => console.log(`  ✓ ${file}`));
  }
  
  console.log('\n=== Pre-release staging complete ===');
}

try {
  main();
} catch (e) {
  console.error(`Error: ${e.message || String(e)}`);
  process.exit(1);
}