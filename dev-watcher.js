#!/usr/bin/env node

const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

const WATCH_PATTERNS = [
  'frontend/src/**/*.{ts,tsx,js,jsx}',
  'backend/**/*.{ts,js}',
  '**/*.{json,md,yml,yaml}'
];

const IGNORED_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/coverage/**'
];

console.log('🚀 Starting development file watcher...');
console.log('📁 Watching patterns:', WATCH_PATTERNS);

const watcher = chokidar.watch(WATCH_PATTERNS, {
  ignored: IGNORED_PATTERNS,
  persistent: true,
  ignoreInitial: true
});

let commitTimeout;
const COMMIT_DELAY = 3000; // 3 seconds delay to batch changes

function autoCommit() {
  exec('git status --porcelain', (error, stdout) => {
    if (error) {
      console.error('❌ Git status error:', error);
      return;
    }

    if (!stdout.trim()) {
      console.log('📝 No changes to commit');
      return;
    }

    const changes = stdout.trim().split('\n');
    console.log(`📄 Found ${changes.length} changed file(s)`);

    // Generate commit message based on changed files
    const changedFiles = changes.map(line => {
      const filePath = line.substring(3);
      return path.basename(filePath);
    });

    const commitMessage = `Auto-commit: Update ${changedFiles.join(', ')}

Development changes detected and automatically committed.

Committed by: ytgTonz`;

    // Stage and commit all changes
    exec('git add . && git commit -m "' + commitMessage.replace(/"/g, '\\"') + '"', 
      (commitError, commitStdout) => {
        if (commitError) {
          console.error('❌ Auto-commit failed:', commitError.message);
          return;
        }
        console.log('✅ Auto-committed changes:', commitStdout.trim());
      }
    );
  });
}

watcher
  .on('change', (filePath) => {
    console.log(`📝 File changed: ${filePath}`);
    
    // Clear existing timeout and set new one
    clearTimeout(commitTimeout);
    commitTimeout = setTimeout(autoCommit, COMMIT_DELAY);
  })
  .on('add', (filePath) => {
    console.log(`➕ File added: ${filePath}`);
    
    clearTimeout(commitTimeout);
    commitTimeout = setTimeout(autoCommit, COMMIT_DELAY);
  })
  .on('unlink', (filePath) => {
    console.log(`🗑️  File removed: ${filePath}`);
    
    clearTimeout(commitTimeout);
    commitTimeout = setTimeout(autoCommit, COMMIT_DELAY);
  })
  .on('error', (error) => {
    console.error('❌ Watcher error:', error);
  });

console.log('👀 File watcher is active. Press Ctrl+C to stop.');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping file watcher...');
  watcher.close();
  process.exit(0);
});