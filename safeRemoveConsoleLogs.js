const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

let totalRemoved = 0;
let filesModified = 0;
let filesWithErrors = [];

function removeConsoleLogsFromFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    let removeCount = 0;
    
    try {
      // Parse the code using Babel parser
      const ast = parser.parse(code, {
        sourceType: 'unambiguous',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'dynamicImport',
          'classProperties',
          'objectRestSpread',
          'asyncGenerators',
          'functionBind',
          'functionSent',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'optionalCatchBinding',
          'throwExpressions',
          'logicalAssignment',
          'nullishCoalescingOperator',
          'optionalChaining',
          'numericSeparator'
        ]
      });
      
      // Track nodes to remove
      const nodesToRemove = [];
      
      // Traverse the AST
      traverse(ast, {
        CallExpression(path) {
          const callee = path.node.callee;
          
          // Check if it's console.log, console.error, etc.
          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'console' &&
            callee.property.type === 'Identifier' &&
            ['log', 'error', 'warn', 'info', 'debug'].includes(callee.property.name)
          ) {
            // If this is a statement (not part of another expression), mark for removal
            if (path.parent.type === 'ExpressionStatement') {
              nodesToRemove.push(path.parent);
              removeCount++;
            }
          }
        }
      });
      
      // Remove the nodes
      nodesToRemove.forEach(node => {
        const parent = node.parent;
        if (parent && parent.body && Array.isArray(parent.body)) {
          const index = parent.body.indexOf(node);
          if (index !== -1) {
            parent.body.splice(index, 1);
          }
        }
      });
      
      // Generate code from modified AST
      const output = generate(ast, {
        retainLines: true,
        retainFunctionParens: true,
        compact: false
      });
      
      if (removeCount > 0) {
        fs.writeFileSync(filePath, output.code, 'utf8');
        console.log(`✓ Removed ${removeCount} console statements from ${filePath}`);
        totalRemoved += removeCount;
        filesModified++;
      }
      
    } catch (parseError) {
      // If Babel parsing fails, fall back to simple regex replacement
      // but be very careful
      const lines = code.split('\n');
      const newLines = [];
      let modified = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Only remove standalone console statements on their own line
        if (line.trim().match(/^console\.(log|error|warn|info|debug)\s*\([^)]*\);?\s*$/)) {
          removeCount++;
          modified = true;
          continue; // Skip this line
        }
        
        newLines.push(line);
      }
      
      if (modified) {
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
        console.log(`✓ Removed ${removeCount} console statements from ${filePath} (using regex fallback)`);
        totalRemoved += removeCount;
        filesModified++;
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
      // Skip minified files and certain scripts
      if (!filePath.includes('removeConsoleLogs.js') &&
          !filePath.includes('fixConsoleLogs.js') &&
          !filePath.includes('safeRemoveConsoleLogs.js') &&
          !filePath.includes('checkSyntax.js') &&
          !filePath.includes('checkEnvVars.js') &&
          !filePath.includes('testStartup.js')) {
        removeConsoleLogsFromFile(filePath);
      }
    }
  });
}

// Check if we have Babel dependencies
try {
  require('@babel/parser');
  require('@babel/traverse');
  require('@babel/generator');
  console.log('Using Babel parser for safe console.log removal\n');
} catch (e) {
  console.log('Babel parser not available, using fallback regex method\n');
  console.log('For safer removal, install: npm install --save-dev @babel/parser @babel/traverse @babel/generator\n');
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
      !file.includes('fixConsoleLogs.js') &&
      !file.includes('safeRemoveConsoleLogs.js') &&
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
  console.log('\n⚠️  Files with potential errors:');
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