const fs = require('fs');
let content = fs.readFileSync('middleware.ts', 'utf8');

// Remove the 301 redirect block
content = content.replace(/\/\/ 301: \/de\/onlyfanssearch\* → \/de\/onlyfans-suche\* \(and ES\/PT equivalents\)[\s\S]*?return NextResponse\.redirect\(url, 301\);\n    }\n  }/, '');

fs.writeFileSync('middleware.ts', content);
