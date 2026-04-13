const fs = require('fs');
const path = require('path');

const directory = 'd:/Finance Website/src';
const searchString = 'const repository = getRepository();';
const replaceString = 'const repository = await getRepository();';

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            walk(filePath);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(searchString)) {
                console.log(`Updating ${filePath}...`);
                content = content.replace(new RegExp('const repository = getRepository\\(\\);', 'g'), replaceString);
                fs.writeFileSync(filePath, content, 'utf8');
            }
        }
    }
}

walk(directory);
console.log('Done!');
