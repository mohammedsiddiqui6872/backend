const fs = require('fs');
const path = require('path');

console.log('Applying final fixes...\n');

// Fix 1: Install Grid2
console.log('Installing MUI Grid2...');
const { execSync } = require('child_process');
try {
  execSync('npm install @mui/material@latest', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
} catch (e) {
  console.log('⚠ Could not update MUI');
}

// Fix 2: Fix Grid2 import in Compliance.tsx
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Use Grid from @mui/material with correct syntax
  content = content.replace(/import Grid2 from '@mui\/material\/Unstable_Grid2';/g, '');
  content = content.replace(/<Grid2/g, '<Grid');
  content = content.replace(/<\/Grid2>/g, '</Grid>');
  
  // Make sure Grid is imported
  if (!content.includes("import { Grid")) {
    content = content.replace(
      /import\s*{([^}]*)}\s*from\s*['"]@mui\/material['"];/,
      (match, imports) => {
        return `import {${imports}, Grid} from '@mui/material';`;
      }
    );
  }
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Fixed Grid imports in Compliance.tsx');
}

// Fix 3: Fix TeamMemberForm Grid imports
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Make sure Grid is imported from MUI
  if (!content.includes("import { Grid") && !content.includes("import Grid")) {
    content = content.replace(
      /import\s*{([^}]*)}\s*from\s*['"]@mui\/material['"];/,
      (match, imports) => {
        return `import {${imports}, Grid} from '@mui/material';`;
      }
    );
  }
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Fixed Grid imports in TeamMemberForm.tsx');
}

// Fix 4: Fix getValues in EditTeamMemberModalRefactored
const modalPath = path.join(__dirname, '..', 'src/components/modals/EditTeamMemberModalRefactored.tsx');
if (fs.existsSync(modalPath)) {
  let content = fs.readFileSync(modalPath, 'utf8');
  
  // Find the useForm destructuring and add getValues
  content = content.replace(
    /const\s*{\s*control,\s*handleSubmit,\s*setValue,\s*watch,\s*formState:\s*{\s*errors,\s*isSubmitting\s*}\s*}\s*=\s*useForm/g,
    'const { control, handleSubmit, setValue, watch, getValues, formState: { errors, isSubmitting } } = useForm'
  );
  
  fs.writeFileSync(modalPath, content);
  console.log('✓ Fixed getValues in EditTeamMemberModalRefactored');
}

// Fix 5: Add categoryAPI export to api.ts
const apiPath = path.join(__dirname, '..', 'src/services/api.ts');
if (fs.existsSync(apiPath)) {
  let content = fs.readFileSync(apiPath, 'utf8');
  
  // Add categoryAPI as alias for menuAPI methods
  if (!content.includes('export const categoryAPI')) {
    content = content.replace(
      /export default api;/,
      `// Category API (alias for menuAPI category methods)
export const categoryAPI = {
  getCategories: menuAPI.getCategories,
  addCategory: menuAPI.addCategory,
  updateCategory: menuAPI.updateCategory,
  deleteCategory: menuAPI.deleteCategory,
};

export default api;`
    );
  }
  
  fs.writeFileSync(apiPath, content);
  console.log('✓ Added categoryAPI export');
}

// Fix 6: Fix useOrderQueries analytics call
const orderQueriesPath = path.join(__dirname, '..', 'src/hooks/queries/useOrderQueries.ts');
if (fs.existsSync(orderQueriesPath)) {
  let content = fs.readFileSync(orderQueriesPath, 'utf8');
  
  // Fix the analytics call that expects no params
  content = content.replace(
    /analyticsAPI\.getDashboardStats\(params\)/g,
    'analyticsAPI.getDashboardStats()'
  );
  
  fs.writeFileSync(orderQueriesPath, content);
  console.log('✓ Fixed analytics API call');
}

console.log('\nAll final fixes applied!');