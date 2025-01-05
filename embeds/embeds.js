const embeds = {};

require('fs').readdirSync('./embeds').forEach(file => {
    if (file.endsWith('_embed.js')) {
        let embed = require(`./${file}`);
        embeds[file.split('_')[0]] = embed;
    }
});

module.exports = {
    embeds
};