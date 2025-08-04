const fs = require('fs');
const path = require('path');

console.log('Restoring Grid components properly...\n');

// Fix TeamMemberForm
const teamFormPath = path.join(__dirname, '..', 'src/components/team/TeamMemberForm.tsx');
if (fs.existsSync(teamFormPath)) {
  let content = fs.readFileSync(teamFormPath, 'utf8');
  
  // Add Grid import if missing
  if (!content.includes("import Grid from '@mui/material/Grid';")) {
    content = content.replace(
      "} from '@mui/material';",
      ", Grid } from '@mui/material';"
    );
  }
  
  // Replace all Box tags with Grid tags
  content = content.replace(/<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>/g, '<Grid container spacing={3}>');
  content = content.replace(/<Box sx={{ flex: "1 1 100%", "@media \(min-width: 900px\)": { flex: "1 1 48%" } }}>/g, '<Grid item xs={12} md={6}>');
  content = content.replace(/<Box sx={{ flex: "1 1 100%", "@media \(min-width: 900px\)": { flex: "1 1 31%" } }}>/g, '<Grid item xs={12} md={4}>');
  content = content.replace(/<Box sx={{ flex: "1 1 100%" }}>/g, '<Grid item xs={12}>');
  content = content.replace(/<\/Box>/g, '</Grid>');
  
  fs.writeFileSync(teamFormPath, content);
  console.log('✓ Restored Grid in TeamMemberForm');
}

// Fix Compliance.tsx
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Add Grid import if missing
  if (!content.includes("import Grid from '@mui/material/Grid';")) {
    content = content.replace(
      "} from '@mui/material';",
      ", Grid } from '@mui/material';"
    );
  }
  
  // Replace all Box tags with Grid tags
  content = content.replace(/<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>/g, '<Grid container spacing={3}>');
  content = content.replace(/<Box sx={{ flex: "1 1 100%", "@media \(min-width: 900px\)": { flex: "1 1 48%" } }} key={([^}]+)}>/g, '<Grid item xs={12} md={6} key={$1}>');
  content = content.replace(/<Box sx={{ flex: "1 1 100%", "@media \(min-width: 900px\)": { flex: "1 1 48%", "@media \(min-width: 1200px\)": { flex: "1 1 31%" } }} key={([^}]+)}>/g, '<Grid item xs={12} md={6} lg={4} key={$1}>');
  content = content.replace(/<Box sx={{ flex: "1 1 100%", "@media \(min-width: 900px\)": { flex: "1 1 23%" } }}>/g, '<Grid item xs={12} md={3}>');
  content = content.replace(/<Box sx={{ flex: "1 1 100%" }}>/g, '<Grid item xs={12}>');
  content = content.replace(/<\/Box>/g, '</Grid>');
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Restored Grid in Compliance.tsx');
}

console.log('\nGrid components restored!');