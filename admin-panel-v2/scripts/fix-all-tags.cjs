const fs = require('fs');
const path = require('path');

console.log('Fixing all remaining tag issues...\n');

// Fix Compliance.tsx
const compliancePath = path.join(__dirname, '..', 'src/pages/Compliance.tsx');
if (fs.existsSync(compliancePath)) {
  let content = fs.readFileSync(compliancePath, 'utf8');
  
  // Replace remaining Grid tags
  content = content.replace(/<Grid container spacing={3}>/g, '<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>');
  content = content.replace(/<Grid item xs={12} md={6} key={([^}]+)}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 48%" } }} key={$1}>');
  content = content.replace(/<Grid item xs={12} md={6} lg={4} key={([^}]+)}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 48%" }, "@media (min-width: 1200px)": { flex: "1 1 31%" } }} key={$1}>');
  content = content.replace(/<Grid item xs={12} md={3}>/g, '<Box sx={{ flex: "1 1 100%", "@media (min-width: 900px)": { flex: "1 1 23%" } }}>');
  content = content.replace(/<Grid item xs={12}>/g, '<Box sx={{ flex: "1 1 100%" }}>');
  
  // Replace all Grid closing tags with Box
  content = content.replace(/<\/Grid>/g, '</Box>');
  
  // Fix the mismatched div/Box tags
  content = content.replace(/<\/div>\s*<\/Box>/g, '</Box>\n              </Box>');
  content = content.replace(/<\/div>\s*<\/TabPanel>/g, '</Box>\n            </TabPanel>');
  content = content.replace(/<\/div>\s*<\/LocalizationProvider>/g, '</Box>\n    </LocalizationProvider>');
  
  fs.writeFileSync(compliancePath, content);
  console.log('✓ Fixed all tags in Compliance.tsx');
}

console.log('\nAll tag issues fixed!');