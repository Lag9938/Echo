import fs from 'fs';
import path from 'path';

function getAllFiles(dir, exts, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, exts, results);
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// 1. Gather all CSS files
const cssFiles = getAllFiles('src/styles', ['.css']);
console.log(`Found ${cssFiles.length} CSS files in src/styles/`);

// 2. Gather all code files
const codeFiles = [
  ...getAllFiles('src', ['.tsx', '.ts', '.html']),
  'index.html'
];
console.log(`Found ${codeFiles.length} source code files to scan for references`);

// Read all code files into memory
const codeContentMap = {};
for (const file of codeFiles) {
  if (fs.existsSync(file)) {
    codeContentMap[file] = fs.readFileSync(file, 'utf8');
  }
}
const allCodeCombined = Object.values(codeContentMap).join('\n');

// 3. Extract CSS classes per file
const classRegex = /\.([a-zA-Z0-9_-]+)(?=[^a-zA-Z0-9_-]|$)/g;

const report = {};
let grandTotalClasses = 0;
let grandTotalUnused = 0;

for (const cssFile of cssFiles) {
  const content = fs.readFileSync(cssFile, 'utf8');
  
  // Strip comments to avoid false positives
  const cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  const classesInFile = new Set();
  let match;
  while ((match = classRegex.exec(cleanContent)) !== null) {
    const cls = match[1];
    // Ignore pure numbers or css pseudo/keyframes percentage numbers
    if (/^\d+$/.test(cls)) continue;
    classesInFile.add(cls);
  }

  const unused = [];
  const used = [];

  for (const cls of classesInFile) {
    // Check if class appears anywhere in the codebase
    // Either exact string or regex word boundary
    const pattern = new RegExp(`\\b${cls}\\b`);
    if (pattern.test(allCodeCombined)) {
      used.push(cls);
    } else {
      unused.push(cls);
    }
  }

  const relPath = path.relative('src/styles', cssFile).replace(/\\/g, '/');
  report[relPath] = {
    total: classesInFile.size,
    used: used.length,
    unused: unused.length,
    unusedList: unused
  };

  grandTotalClasses += classesInFile.size;
  grandTotalUnused += unused.length;
}

console.log('\n================ CSS AUDIT SUMMARY ================');
console.table(Object.keys(report).map(file => ({
  File: file,
  Total: report[file].total,
  Used: report[file].used,
  Unused: report[file].unused,
  UsageRate: `${Math.round((report[file].used / (report[file].total || 1)) * 100)}%`
})));

console.log(`\nGrand Total Unique Class Selectors: ${grandTotalClasses}`);
console.log(`Grand Total Potentially Unused Classes: ${grandTotalUnused}`);
console.log(`Overall Codebase CSS Utilization: ${Math.round(((grandTotalClasses - grandTotalUnused) / grandTotalClasses) * 100)}%`);

// Save detailed audit report to JSON
fs.writeFileSync('scripts/css-audit-results.json', JSON.stringify(report, null, 2), 'utf8');
console.log('\nDetailed results written to scripts/css-audit-results.json');
