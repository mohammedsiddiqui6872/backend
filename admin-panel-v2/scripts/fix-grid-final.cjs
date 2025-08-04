const fs = require('fs');
const path = require('path');

console.log('Applying final Grid fixes for MUI v7...\n');

// Fix TeamMemberForm to use Grid with size prop instead of xs/md
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Use regular Grid from MUI
  content = content.replace(
    "import Grid2 from '@mui/material/Grid2';",
    "import Grid from '@mui/material/Grid';"
  );
  
  // Replace Grid2 with Grid
  content = content.replace(/Grid2/g, 'Grid');
  
  // Fix Grid props - replace xs/md with size
  content = content.replace(/<Grid\s+xs={12}\s+md={6}>/g, '<Grid size={{ xs: 12, md: 6 }}>');
  content = content.replace(/<Grid\s+xs={12}\s+md={4}>/g, '<Grid size={{ xs: 12, md: 4 }}>');
  content = content.replace(/<Grid\s+xs={12}>/g, '<Grid size={12}>');
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Fixed Grid usage in TeamMemberForm');
}

// Fix Compliance.tsx
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Use regular Grid from MUI
  content = content.replace(
    "import Grid2 from '@mui/material/Grid2';",
    "import Grid from '@mui/material/Grid';"
  );
  
  // Replace Grid2 with Grid
  content = content.replace(/Grid2/g, 'Grid');
  
  // Fix Grid props
  content = content.replace(/<Grid\s+xs={12}\s+md={6}>/g, '<Grid size={{ xs: 12, md: 6 }}>');
  content = content.replace(/<Grid\s+xs={12}\s+md={3}>/g, '<Grid size={{ xs: 12, md: 3 }}>');
  content = content.replace(/<Grid\s+xs={12}\s+md={6}\s+lg={4}>/g, '<Grid size={{ xs: 12, md: 6, lg: 4 }}>');
  content = content.replace(/<Grid\s+xs={12}>/g, '<Grid size={12}>');
  
  // Fix Grid with key prop
  content = content.replace(/<Grid\s+xs={12}\s+md={6}\s+key={([^}]+)}>/g, '<Grid size={{ xs: 12, md: 6 }} key={$1}>');
  content = content.replace(/<Grid\s+xs={12}\s+md={6}\s+lg={4}\s+key={([^}]+)}>/g, '<Grid size={{ xs: 12, md: 6, lg: 4 }} key={$1}>');
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Fixed Grid usage in Compliance.tsx');
}

console.log('\nAll Grid fixes applied!');