const fs = require('fs');
const path = require('path');

console.log('Fixing Grid usage for MUI v5+...\n');

// Fix TeamMemberForm Grid usage
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Use Grid2 from MUI
  content = content.replace(
    "import Grid from '@mui/material/Grid';",
    "import Grid2 from '@mui/material/Unstable_Grid2';"
  );
  
  // Replace Grid with Grid2
  content = content.replace(/<Grid\s+container/g, '<Grid2 container');
  content = content.replace(/<Grid\s+item/g, '<Grid2');
  content = content.replace(/<\/Grid>/g, '</Grid2>');
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Fixed Grid usage in TeamMemberForm');
}

// Fix Compliance.tsx Grid usage
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Use Grid2 from MUI
  content = content.replace(
    "import Grid from '@mui/material/Grid';",
    "import Grid2 from '@mui/material/Unstable_Grid2';"
  );
  
  // Replace Grid with Grid2
  content = content.replace(/<Grid\s+/g, '<Grid2 ');
  content = content.replace(/<\/Grid>/g, '</Grid2>');
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Fixed Grid usage in Compliance.tsx');
}

// Fix EditTeamMemberModalRefactored formData issue
const modalPath = path.join(__dirname, '..', 'src/components/modals/EditTeamMemberModalRefactored.tsx');
if (fs.existsSync(modalPath)) {
  let content = fs.readFileSync(modalPath, 'utf8');
  
  // Fix the FormData naming conflict
  content = content.replace(
    'const formData = new FormData();',
    'const uploadData = new FormData();'
  );
  content = content.replace(
    'formData.append(\'document\',',
    'uploadData.append(\'document\','
  );
  content = content.replace(
    'formData.append(\'type\',',
    'uploadData.append(\'type\','
  );
  content = content.replace(
    'formData.append(\'expiryDate\',',
    'uploadData.append(\'expiryDate\','
  );
  
  fs.writeFileSync(modalPath, content);
  console.log('✓ Fixed formData naming conflict in EditTeamMemberModalRefactored');
}

console.log('\nAll Grid usage fixes applied!');