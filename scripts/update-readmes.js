#!/usr/bin/env node
'use strict';

/**
 * update-readmes.js
 *
 * Creates or updates README files with a concise summary of the most recent
 * repository activity. Inspired by generate-readme-tasks, it automatically
 * gathers git context and keeps documentation aligned with the latest work.
 *
 * Usage:
 *   node scripts/update-readmes.js [--dry] [--limit 5] [--since-tag]
 *                                  [--target path/to/README.md] [--all]
 *                                  [--no-files] [--with-author] [--no-create]
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const {
  collectCommits,
  buildSummaryInsights,
  selectHighlights,
  formatCommitLine
} = require('../src/utils/git');

const root = path.join(__dirname, '..');

// ----- CLI helpers -----

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const fragment = argv[i];
    if (!fragment.startsWith('--')) {
      result._ = result._ || [];
      result._.push(fragment);
      continue;
    }

    const [flag, inline] = fragment.split('=');
    const key = flag.slice(2);
    const next = argv[i + 1];

    if (inline !== undefined) {
      result[key] = inline;
      continue;
    }

    if (next && !next.startsWith('--')) {
      result[key] = next;
      i += 1;
      continue;
    }

    result[key] = true;
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));

function parseLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 5;
  }
  return parsed;
}

const options = {
  dry: Boolean(args.dry),
  limit: parseLimit(args.limit || args['limit-commits'] || '5'),
  all: Boolean(args.all),
  target: args.target ? path.resolve(root, args.target) : null,
  includeFiles: !Boolean(args['no-files']),
  includeAuthor: Boolean(args['with-author']),
  createMissing: !Boolean(args['no-create']),
  sinceTag: Boolean(args['since-tag'])
};

// ----- Git helpers -----

function execCapture(command) {
  try {
    return cp.execSync(command, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function getLastTag() {
  const tag = execCapture('git describe --tags --abbrev=0');
  return tag || null;
}

// ----- README discovery -----

function discoverReadmes(baseDir) {
  const results = [];
  const queue = [baseDir];
  const ignore = new Set(['.git', 'node_modules', 'tmp', '.cache']);

  while (queue.length) {
    const current = queue.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.forEach((entry) => {
      if (ignore.has(entry.name)) {
        return;
      }

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        return;
      }

      if (/readme\.md$/i.test(entry.name)) {
        results.push(fullPath);
      }
    });
  }

  return results;
}

function resolveTargets() {
  if (options.target) {
    return [options.target];
  }

  if (options.all) {
    return Array.from(new Set(discoverReadmes(root)));
  }

  return [path.join(root, 'README.md')];
}

// ----- Rendering helpers -----

function loadPackageMetadata() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return {
      name: pkg.name || 'Project',
      description: pkg.description || '',
      scripts: pkg.scripts || {}
    };
  } catch {
    return { name: 'Project', description: '', scripts: {} };
  }
}

function renderScriptsList(scripts) {
  const entries = Object.entries(scripts || {});
  if (!entries.length) return '';
  const lines = ['## Available Scripts', ''];
  entries.forEach(([scriptName, command]) => {
    lines.push(`- \`${scriptName}\`: ${command}`);
  });
  return lines.join('\n');
}

function renderRecentUpdatesSection(summaryLines, highlightCommits) {
  const lines = ['<!-- recent-updates:start -->', '## Recent Updates', '', `> _Last updated: ${new Date().toISOString()}_`, ''];

  if (summaryLines.length) {
    summaryLines.forEach((line) => {
      lines.push(`- ${line}`);
    });
  }

  if (highlightCommits.length) {
    lines.push('', '### Highlights', '');
    highlightCommits.forEach((commit) => {
      lines.push(formatCommitLine(commit, {
        includeFiles: options.includeFiles,
        includeRefs: true,
        includeAuthor: options.includeAuthor
      }));
    });
  }

  if (!summaryLines.length && !highlightCommits.length) {
    lines.push('_No tracked changes found._');
  }

  lines.push('', '<!-- recent-updates:end -->');
  return lines.join('\n');
}

function injectSection(content, section) {
  const startMarker = '<!-- recent-updates:start -->';
  const endMarker = '<!-- recent-updates:end -->';

  if (content.includes(startMarker) && content.includes(endMarker)) {
    const pattern = new RegExp(`${startMarker}[\s\S]*?${endMarker}`, 'm');
    return content.replace(pattern, section);
  }

  const firstHeadingIndex = content.indexOf('\n## ');
  if (firstHeadingIndex === -1) {
    return `${content.trimEnd()}\n\n${section}\n`;
  }

  const before = content.slice(0, firstHeadingIndex).trimEnd();
  const after = content.slice(firstHeadingIndex).trimStart();
  return `${before}\n\n${section}\n\n${after}`;
}

function createReadmeTemplate(metadata, section) {
  const lines = [`# ${metadata.name}`, '', metadata.description, '', section];
  const scriptsBlock = renderScriptsList(metadata.scripts);
  if (scriptsBlock) {
    lines.push('', scriptsBlock);
  }
  lines.push('', '## Getting Started', '', '1. Install dependencies with `npm install`.', '2. Run the relevant scripts from the list above to automate your workflow.', '', '## License', '', 'Refer to the project license for usage details.');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

function processReadme(targetPath, section, metadata) {
  const relative = path.relative(root, targetPath);

  if (!fs.existsSync(targetPath)) {
    if (!options.createMissing) {
      console.log(`[skip] Missing README at ${relative}`);
      return;
    }

    const template = createReadmeTemplate(metadata, section);
    if (options.dry) {
      console.log(`[dry] Would create ${relative}`);
    } else {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, template, 'utf8');
      console.log(`[create] ${relative}`);
    }
    return;
  }

  const existing = fs.readFileSync(targetPath, 'utf8');
  const updated = injectSection(existing, section);

  if (existing === updated) {
    console.log(`[noop] ${relative} already up to date`);
    return;
  }

  if (options.dry) {
    console.log(`[dry] Would update ${relative}`);
    return;
  }

  fs.writeFileSync(targetPath, updated, 'utf8');
  console.log(`[update] ${relative}`);
}

function main() {
  const metadata = loadPackageMetadata();
  const since = options.sinceTag ? getLastTag() : null;
  const { commits } = collectCommits({ since });

  const summaryLines = buildSummaryInsights(commits);
  const highlights = selectHighlights(commits, options.limit);
  const section = renderRecentUpdatesSection(summaryLines, highlights);

  const targets = resolveTargets();
  targets.forEach((target) => processReadme(target, section, metadata));
}

try {
  main();
} catch (error) {
  console.error(`Error updating README files: ${error.message || error}`);
  process.exit(1);
}
