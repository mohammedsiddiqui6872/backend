const fs = require('fs');
const path = require('path');

let errors = 0;
let checked = 0;

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const requireRegex = /require\s*\(\s*['"`]([^'"`)]+)['"`]\s*\)/g;
  
  let match;
  while ((match = requireRegex.exec(content)) !== null) {
    const moduleName = match[1];
    
    // Skip relative paths and built-in modules
    if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
      continue;
    }
    
    // Check if it's a built-in Node.js module
    const builtins = ['fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'stream', 'events', 'child_process', 'cluster', 'dgram', 'dns', 'net', 'readline', 'repl', 'tls', 'tty', 'url', 'v8', 'vm', 'zlib'];
    if (builtins.includes(moduleName)) {
      continue;
    }
    
    // Try to resolve the module
    try {
      require.resolve(moduleName);
    } catch (e) {
      console.error(`❌ Missing module in ${filePath}: ${moduleName}`);
      errors++;
    }
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        walkDir(filePath);
      }
    } else if (file.endsWith('.js')) {
      checked++;
      checkFile(filePath);
    }
  });
}

console.log('Checking for missing dependencies...\n');

// Check source files
if (fs.existsSync('./src')) {
  walkDir('./src');
}

// Check root files
const rootFiles = fs.readdirSync('.');
rootFiles.forEach(file => {
  if (file.endsWith('.js') && !file.includes('check')) {
    const filePath = path.join('.', file);
    if (fs.statSync(filePath).isFile()) {
      checked++;
      checkFile(filePath);
    }
  }
});

console.log(`\n✅ Checked ${checked} files`);
if (errors > 0) {
  console.log(`❌ Found ${errors} missing dependencies`);
  process.exit(1);
} else {
  console.log('✅ All dependencies are installed!');
}