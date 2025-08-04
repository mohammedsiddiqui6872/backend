const fs = require('fs');
const path = require('path');

let totalRemoved = 0;
let filesModified = 0;

function removeConsoleLogsFromFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Remove console.log statements (handles multi-line console.log as well)
  // This regex matches console.log with any content including newlines
  const consoleLogRegex = /console\.log\s*\([^)]*\)(?:\s*\+[^;]*)*;?/gs;
  
  // Count how many we're removing
  const matches = content.match(consoleLogRegex);
  const removeCount = matches ? matches.length : 0;
  
  if (removeCount > 0) {
    content = content.replace(consoleLogRegex, '');
    
    // Clean up empty lines left behind
    content = content.replace(/^\s*[\r\n]/gm, '');
    
    // Write back only if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Removed ${removeCount} console.log statements from ${filePath}`);
      totalRemoved += removeCount;
      filesModified++;
    }
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other directories we don't want to modify
      if (!file.includes('node_modules') && 
          !file.includes('.git') && 
          !file.includes('uploads') &&
          !file.includes('logs') &&
          !file.includes('build') &&
          !file.includes('dist')) {
        walkDir(filePath);
      }
    } else if (file.endsWith('.js') && !file.includes('.min.js')) {
      // Skip minified files and this script itself
      if (filePath !== __filename) {
        removeConsoleLogsFromFile(filePath);
      }
    }
  });
}

console.log('Removing console.log statements from backend JavaScript files...\n');

// Process src directory
if (fs.existsSync('./src')) {
  walkDir('./src');
}

// Process root level JS files
const rootFiles = fs.readdirSync('.');
rootFiles.forEach(file => {
  if (file.endsWith('.js') && 
      !file.includes('.min.js') && 
      !file.includes('removeConsoleLogs.js') &&
      !file.includes('checkSyntax.js') &&
      !file.includes('checkEnvVars.js') &&
      !file.includes('testStartup.js')) {
    const filePath = path.join('.', file);
    if (fs.statSync(filePath).isFile()) {
      removeConsoleLogsFromFile(filePath);
    }
  }
});

// Process scripts directory
if (fs.existsSync('./scripts')) {
  walkDir('./scripts');
}

console.log(`\n✅ Complete! Removed ${totalRemoved} console.log statements from ${filesModified} files.`);

// Verify syntax of modified files
console.log('\nVerifying syntax of modified files...');
const { execSync } = require('child_process');
let syntaxErrors = 0;

// Re-check syntax of all JS files
try {
  execSync('node checkSyntax.js', { stdio: 'pipe' });
  console.log('✅ All files have valid syntax after console.log removal!');
} catch (error) {
  console.error('❌ Syntax errors detected after removal. Please check the files.');
  syntaxErrors++;
}

if (syntaxErrors === 0) {
  console.log('\n🎉 Successfully removed all console.log statements!');
} else {
  process.exit(1);
}