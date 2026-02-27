const fs = require('fs');

const files = [
    'c:\\Users\\jimmy\\Downloads\\better-yako\\better-yako-\\languages\\fr.json',
    'c:\\Users\\jimmy\\Downloads\\better-yako\\better-yako-\\languages\\en.json'
];

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        // Check for duplicate keys using a custom parser or regex since JSON.parse might just overwrite
        // But JSON.parse will throw on syntax errors
        JSON.parse(content);
        console.log(`✅ ${file} is valid JSON.`);
        
        // Check for duplicate keys using regex
        const keys = [];
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            const match = line.match(/"([^"]+)":/);
            if (match) {
                // simple check, might be too aggressive for nested objects
                // better to just rely on the linter's report which I already have
            }
        });

    } catch (e) {
        console.error(`❌ ${file} has error: ${e.message}`);
        if (e.message.includes('position')) {
            const pos = parseInt(e.message.match(/position (\d+)/)[1]);
            const content = fs.readFileSync(file, 'utf8');
            console.log('Context around error:');
            console.log(content.substring(pos - 50, pos + 50));
        }
    }
});
