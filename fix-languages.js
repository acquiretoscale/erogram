const fs = require('fs');
const files = [
  'app/bots/page.tsx',
  'app/groups/page.tsx',
  'app/about/page.tsx',
  'app/best-onlyfans-accounts/[category]/page.tsx',
  'app/best-onlyfans-accounts/page.tsx',
  'app/add/page.tsx',
  'app/best-telegram-groups/[category]/page.tsx',
  'app/best-telegram-groups/page.tsx',
  'app/[slug]/page.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  // Remove languages: Object.fromEntries(...) block
  content = content.replace(/languages:\s*Object\.fromEntries\([\s\S]*?\),?/g, '');
  fs.writeFileSync(file, content);
});
