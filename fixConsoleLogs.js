const fs = require('fs');
const path = require('path');

let totalRemoved = 0;
let filesModified = 0;
let filesWithErrors = [];

function removeConsoleLogsFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // More precise regex patterns for different console.log patterns
    const patterns = [
      // Simple console.log on single line
      /console\.log\s*\([^)]*\);?\s*$/gm,
      // console.log with string concatenation
      /console\.log\s*\([^)]*\s*\+[^;)]*\);?\s*$/gm,
      // Multi-line console.log (careful with this one)
      /console\.log\s*\(([\s\S]*?)\);\s*$/gm,
      // console.error, console.warn, etc.
      /console\.(error|warn|info|debug)\s*\([^)]*\);?\s*$/gm,
      // console methods with multi-line
      /console\.(error|warn|info|debug)\s*\(([\s\S]*?)\);\s*$/gm
    ];
    
    let removeCount = 0;
    
    // First, let's identify all console statements
    const allConsoleRegex = /console\.\w+\s*\([^)]*\);?/g;
    const matches = content.match(allConsoleRegex);
    if (matches) {
      removeCount = matches.length;
    }
    
    // Remove console statements more carefully
    // Split by lines and process line by line for better control
    const lines = content.split('\n');
    const newLines = [];
    let inMultiLineConsole = false;
    let parenCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line starts a console statement
      if (line.match(/^\s*console\.\w+\s*\(/)) {
        inMultiLineConsole = true;
        parenCount = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        
        // If parentheses are balanced on same line, skip this line
        if (parenCount === 0) {
          inMultiLineConsole = false;
          continue;
        }
      } else if (inMultiLineConsole) {
        // Count parentheses
        parenCount += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        
        // If we've closed all parentheses, we're done with this console statement
        if (parenCount <= 0) {
          inMultiLineConsole = false;
        }
        continue;
      } else {
        // Check for single-line console statements in the middle of the line
        const cleanedLine = line.replace(/console\.\w+\s*\([^)]*\);?/g, '');
        if (cleanedLine !== line) {
          if (cleanedLine.trim() === '') {
            continue; // Skip empty lines
          }
          newLines.push(cleanedLine);
        } else {
          newLines.push(line);
        }
      }
    }
    
    content = newLines.join('\n');
    
    // Clean up any double blank lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Write back only if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Removed ${removeCount} console statements from ${filePath}`);
      totalRemoved += removeCount;
      filesModified++;
      
      // Verify the file syntax
      try {
        require(filePath);
      } catch (syntaxError) {
        filesWithErrors.push({ file: filePath, error: syntaxError.message });
      }
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    filesWithErrors.push({ file: filePath, error: error.message });
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
      if (filePath !== __filename && !filePath.includes('removeConsoleLogs.js')) {
        removeConsoleLogsFromFile(filePath);
      }
    }
  });
}

// First, let's fix the known syntax errors
console.log('Fixing known syntax errors first...\n');

// Fix team.js
const teamPath = './src/routes/team.js';
if (fs.existsSync(teamPath)) {
  let teamContent = fs.readFileSync(teamPath, 'utf8');
  // Remove the stray closing parenthesis on line 100
  teamContent = teamContent.replace(/(\s*if \(isActive !== undefined && isActive !== ''\) query\.isActive = isActive === 'true';\s*)\);/, '$1');
  // Remove the stray closing parenthesis on line 297
  teamContent = teamContent.replace(/(router\.post\('\/members\/:id\/documents', authenticate, authorize\(\['users\.manage'\]\), enterpriseTenantIsolation, \(req, res, next\) => \{\s*)\);/, '$1');
  fs.writeFileSync(teamPath, teamContent, 'utf8');
  console.log('✓ Fixed syntax errors in team.js');
}

console.log('\nRemoving console.log statements from backend JavaScript files...\n');

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
      !file.includes('fixConsoleLogs.js') &&
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

console.log(`\n✅ Complete! Removed ${totalRemoved} console statements from ${filesModified} files.`);

if (filesWithErrors.length > 0) {
  console.log('\n⚠️  Files with potential syntax errors:');
  filesWithErrors.forEach(({ file, error }) => {
    console.log(`  - ${file}: ${error.split('\n')[0]}`);
  });
}

// Verify syntax of all JS files
console.log('\nVerifying syntax of all files...');
const { execSync } = require('child_process');
try {
  execSync('node checkSyntax.js', { stdio: 'inherit' });
  console.log('\n🎉 All files have valid syntax!');
} catch (error) {
  console.error('\n❌ Some files still have syntax errors. Please check manually.');
  process.exit(1);
}