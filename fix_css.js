const fs = require('fs');
let c = fs.readFileSync('src/style.css', 'utf8');
// Use a very broad regex to catch it
c = c.replace(/font-family:\s*\"\s*Outfit\\,[\s\r\n]*ns-serif;/g, 'font-family: \"Outfit\", sans-serif;');
fs.writeFileSync('src/style.css', c, 'utf8');
console.log('Fixed');
