const fs = require('fs');
const path = require('path');

console.log('Fixing mismatched Grid/Box tags...\n');

// Fix TeamMemberForm
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Replace closing Grid tags with Box
  content = content.replace(/<\/Grid>/g, '</Box>');
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Fixed closing tags in TeamMemberForm');
}

// Fix Compliance.tsx
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Replace closing Grid tags with Box
  content = content.replace(/<\/Grid>/g, '</Box>');
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Fixed closing tags in Compliance.tsx');
}

console.log('\nAll mismatched tags fixed!');