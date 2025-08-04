const fs = require('fs');
const path = require('path');

console.log('Finishing Box replacement...\n');

// Fix remaining Grid references in TeamMemberForm
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Replace all remaining Grid references
  content = content.replace(/<Grid container spacing={3}>/g, '<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>');
  content = content.replace(/<Grid item xs={12} md={6}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 48%" } }}>');
  content = content.replace(/<Grid item xs={12} md={4}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 31%" } }}>');
  content = content.replace(/<Grid item xs={12}>/g, '<Box sx={{ flex: "1 1 100%" }}>');
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Fixed remaining Grid references in TeamMemberForm');
}

// Fix remaining Grid references in Compliance.tsx
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Replace all remaining Grid references
  content = content.replace(/<Grid container spacing={3}>/g, '<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>');
  content = content.replace(/<Grid item xs={12} md={3}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 23%" } }}>');
  content = content.replace(/<Grid item xs={12}>/g, '<Box sx={{ flex: "1 1 100%" }}>');
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Fixed remaining Grid references in Compliance.tsx');
}

console.log('\nAll Grid references replaced with Box!');