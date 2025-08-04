const fs = require('fs');
const path = require('path');

console.log('Reverting to legacy Grid usage for compatibility...\n');

// Fix TeamMemberForm
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Add item prop back to all Grid components except container
  content = content.replace(/<Grid\s+xs=/g, '<Grid item xs=');
  content = content.replace(/<Grid\s+container/g, '<Grid container');
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Fixed Grid usage in TeamMemberForm');
}

// Fix Compliance.tsx
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Add item prop back to all Grid components except container
  content = content.replace(/<Grid\s+xs=/g, '<Grid item xs=');
  content = content.replace(/<Grid\s+container/g, '<Grid container');
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Fixed Grid usage in Compliance.tsx');
}

console.log('\nLegacy Grid fixes applied!');