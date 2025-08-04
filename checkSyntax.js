const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let errorCount = 0;
let checkedCount = 0;

function checkFile(filePath) {
  try {
    execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
    checkedCount++;
  } catch (error) {
    console.error(`Syntax error in ${filePath}:`);
    console.error(error.message);
    errorCount++;
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      walkDir(filePath);
    } else if (file.endsWith('.js')) {
      checkFile(filePath);
    }
  });
}

console.log('Checking syntax of all JavaScript files...\n');

// Check src directory
walkDir('./src');

// Check main files
checkFile('./server-multi-tenant.js');
if (fs.existsSync('./server.js')) {
  checkFile('./server.js');
}

console.log(`\n\nSyntax check complete!`);
console.log(`Files checked: ${checkedCount}`);
console.log(`Errors found: ${errorCount}`);

if (errorCount === 0) {
  console.log('\n✅ All files have valid syntax!');
} else {
  console.log('\n❌ Some files have syntax errors. Please fix them before deployment.');
  process.exit(1);
}