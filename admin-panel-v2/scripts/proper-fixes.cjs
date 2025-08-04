const fs = require('fs');
const path = require('path');

console.log('Applying proper TypeScript fixes...\n');

// Fix 1: Fix duplicate Grid import in TeamMemberForm
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Fix duplicate Grid import
  content = content.replace(
    `, Grid} from '@mui/material';`,
    `} from '@mui/material';`
  );
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Fixed duplicate Grid import in TeamMemberForm');
}

// Fix 2: Fix getValues not found in EditTeamMemberModalRefactored
const modalPath = path.join(__dirname, '..', 'src/components/modals/EditTeamMemberModalRefactored.tsx');
if (fs.existsSync(modalPath)) {
  let content = fs.readFileSync(modalPath, 'utf8');
  
  // Find where useForm is called and ensure getValues is destructured
  const useFormMatch = content.match(/const\s*{\s*([^}]+)\s*}\s*=\s*useForm/);
  if (useFormMatch && !useFormMatch[1].includes('getValues')) {
    const destructuredProps = useFormMatch[1];
    const newDestructured = destructuredProps.replace('formState:', 'getValues, formState:');
    content = content.replace(useFormMatch[0], `const { ${newDestructured} } = useForm`);
  }
  
  fs.writeFileSync(modalPath, content);
  console.log('✓ Fixed getValues in EditTeamMemberModalRefactored');
}

// Fix 3: Fix Grid import and usage in Compliance.tsx  
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Use Grid2 from @mui/material
  if (!content.includes('@mui/material/Unstable_Grid2')) {
    content = content.replace(
      /import\s*{([^}]*Grid[^}]*)\}\s*from\s*['"]@mui\/material['"];/,
      (match, imports) => {
        const importsList = imports.split(',').map(i => i.trim());
        const withoutGrid = importsList.filter(i => i !== 'Grid').join(', ');
        return `import { ${withoutGrid} } from '@mui/material';\nimport Grid2 from '@mui/material/Unstable_Grid2';`;
      }
    );
    
    // Replace Grid with Grid2
    content = content.replace(/<Grid\s+container/g, '<Grid2 container');
    content = content.replace(/<Grid\s+/g, '<Grid2 ');
    content = content.replace(/<\/Grid>/g, '</Grid2>');
  }
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Fixed Grid usage in Compliance.tsx');
}

// Fix 4: Install missing Grid2 package
console.log('\nInstalling @mui/material Grid2...');
const { execSync } = require('child_process');
try {
  execSync('npm install @mui/material@latest @emotion/react@latest @emotion/styled@latest', { 
    cwd: path.join(__dirname, '..'), 
    stdio: 'inherit' 
  });
  console.log('✓ Updated MUI packages');
} catch (e) {
  console.log('⚠ Could not update packages');
}

console.log('\nAll proper fixes applied!');