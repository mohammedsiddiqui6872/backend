const fs = require('fs');
const path = require('path');

console.log('Cleaning up div attributes...\n');

// Fix TeamMemberForm
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Remove spacing and xs/md props from divs
  content = content.replace(/<div spacing={3}>/g, '<div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>');
  content = content.replace(/<div xs={12} md={6}>/g, '<div style={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 48%" } }}>');
  content = content.replace(/<div xs={12} md={4}>/g, '<div style={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 31%" } }}>');
  content = content.replace(/<div xs={12}>/g, '<div style={{ flex: "1 1 100%" }}>');
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Cleaned up div attributes in TeamMemberForm');
}

// Fix Compliance.tsx
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Remove spacing and xs/md/lg props from divs
  content = content.replace(/<div spacing={3}>/g, '<div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>');
  content = content.replace(/<div xs={12} md={6} key={([^}]+)}>/g, '<div style={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 48%" } }} key={$1}>');
  content = content.replace(/<div xs={12} md={6} lg={4} key={([^}]+)}>/g, '<div style={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 48%" }, "@media (min-width: 1200px)": { flex: "1 1 31%" } }} key={$1}>');
  content = content.replace(/<div xs={12} md={3}>/g, '<div style={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 23%" } }}>');
  content = content.replace(/<div xs={12}>/g, '<div style={{ flex: "1 1 100%" }}>');
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Cleaned up div attributes in Compliance.tsx');
}

console.log('\nAll div attributes cleaned up!');