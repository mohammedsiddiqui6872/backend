const fs = require('fs');
const path = require('path');

console.log('Replacing Grid with Box layout for MUI v7 compatibility...\n');

// Fix TeamMemberForm
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Replace Grid import with Box
  content = content.replace(
    "import Grid from '@mui/material/Grid';",
    ""
  );
  
  // Replace Grid container with Box
  content = content.replace(/<Grid container spacing={3}>/g, '<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>');
  content = content.replace(/<\/Grid>/g, '</Box>');
  
  // Replace Grid items with Box
  content = content.replace(/<Grid item xs={12} md={6}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 48%" } }}>');
  content = content.replace(/<Grid item xs={12} md={4}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 31%" } }}>');
  content = content.replace(/<Grid item xs={12}>/g, '<Box sx={{ flex: "1 1 100%" }}>');
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Replaced Grid with Box in TeamMemberForm');
}

// Fix Compliance.tsx
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Replace Grid import with Box
  content = content.replace(
    "import Grid from '@mui/material/Grid';",
    ""
  );
  
  // Replace Grid container with Box
  content = content.replace(/<Grid container spacing={3}>/g, '<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>');
  content = content.replace(/<\/Grid>/g, '</Box>');
  
  // Replace Grid items with Box
  content = content.replace(/<Grid item xs={12} md={6} key={([^}]+)}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 48%" } }} key={$1}>');
  content = content.replace(/<Grid item xs={12} md={6} lg={4} key={([^}]+)}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 48%" }, "@media (min-width: 1200px)": { flex: "1 1 31%" } }} key={$1}>');
  content = content.replace(/<Grid item xs={12} md={3}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 23%" } }}>');
  content = content.replace(/<Grid item xs={12}>/g, '<Box sx={{ flex: "1 1 100%" }}>');
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Replaced Grid with Box in Compliance.tsx');
}

console.log('\nBox layout fixes applied!');