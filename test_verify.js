const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Find all id attributes
const ids = new Set();
const idRegex = /id=["']([^"']+)["']/g;
let m;
while ((m = idRegex.exec(html)) !== null) {
  ids.add(m[1]);
}

// Find all getElementById calls
const getElRegex = /document\.getElementById\(["']([^"']+)["']\)/g;
const missing = [];
const checked = new Set();
while ((m = getElRegex.exec(html)) !== null) {
  const targetId = m[1];
  if (!checked.has(targetId)) {
    checked.add(targetId);
    if (!ids.has(targetId)) {
      missing.push(targetId);
    }
  }
}

console.log('Total IDs found in HTML:', ids.size);
console.log('Checked getElementById calls:', checked.size);
console.log('Missing getElementById targets:', missing);

// Check qr-mappings.json validity
const jsonContent = fs.readFileSync('qr-mappings.json', 'utf8');
const mappings = JSON.parse(jsonContent);
console.log('qr-mappings.json loaded successfully. Total mappings:', mappings.length);

for (const item of mappings) {
  if (item.mode === 'url' && item.audioUrl) {
    const localPath = item.audioUrl.replace(/^\.\//, '');
    if (fs.existsSync(localPath)) {
      console.log(`[OK] audio file exists: ${localPath}`);
    } else {
      console.log(`[WARN] audio file not found on disk: ${localPath}`);
    }
  }
}
