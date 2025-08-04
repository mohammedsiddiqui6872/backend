const fs = require('fs');
const path = require('path');

console.log('Replacing Grid/Box with simple divs...\n');

// Fix TeamMemberForm
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Replace Grid container with div
  content = content.replace(/<Grid container spacing={3}>/g, '<div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>');
  
  // Replace Grid items with div
  content = content.replace(/<Grid item xs={12} md={6}>/g, '<div style={{ flex: "1 1 100%", maxWidth: "100%", "@media (min-width: 900px)": { flex: "1 1 48%", maxWidth: "48%" } }}>');
  content = content.replace(/<Grid item xs={12} md={4}>/g, '<div style={{ flex: "1 1 100%", maxWidth: "100%", "@media (min-width: 900px)": { flex: "1 1 31%", maxWidth: "31%" } }}>');
  content = content.replace(/<Grid item xs={12}>/g, '<div style={{ flex: "1 1 100%", maxWidth: "100%" }}>');
  
  // Replace all Grid opening tags that have no attributes
  content = content.replace(/<Grid item /g, '<div ');
  
  // Replace Grid container tags
  content = content.replace(/<Grid container /g, '<div ');
  
  // Replace all Grid closing tags
  content = content.replace(/<\/Grid>/g, '</div>');
  
  // Remove Grid import
  content = content.replace(', Grid ', ' ');
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Replaced Grid with divs in TeamMemberForm');
}

// Fix Compliance.tsx
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Replace Grid container with div
  content = content.replace(/<Grid container spacing={3}>/g, '<div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>');
  
  // Replace Grid items with div
  content = content.replace(/<Grid item xs={12} md={6} key={([^}]+)}>/g, '<div style={{ flex: "1 1 100%", maxWidth: "100%", "@media (min-width: 900px)": { flex: "1 1 48%", maxWidth: "48%" } }} key={$1}>');
  content = content.replace(/<Grid item xs={12} md={6} lg={4} key={([^}]+)}>/g, '<div style={{ flex: "1 1 100%", maxWidth: "100%", "@media (min-width: 900px)": { flex: "1 1 48%", maxWidth: "48%" }, "@media (min-width: 1200px)": { flex: "1 1 31%", maxWidth: "31%" } }} key={$1}>');
  content = content.replace(/<Grid item xs={12} md={3}>/g, '<div style={{ flex: "1 1 100%", maxWidth: "100%", "@media (min-width: 900px)": { flex: "1 1 23%", maxWidth: "23%" } }}>');
  content = content.replace(/<Grid item xs={12}>/g, '<div style={{ flex: "1 1 100%", maxWidth: "100%" }}>');
  
  // Replace all Grid closing tags
  content = content.replace(/<\/Grid>/g, '</div>');
  
  // Remove Grid import
  content = content.replace(', Grid ', ' ');
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Replaced Grid with divs in Compliance.tsx');
}

console.log('\nAll Grid components replaced with divs!');