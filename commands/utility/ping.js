const { SlashCommandBuilder } = require('discord.js');
const { adminID} = process.env;
const embeds = require('../../embeds/embeds').embeds;
//const pool = require('../../database/database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
        .setDescription('Renvoie pong'),
    async execute(ctx) {
		ctx.reply({ embeds: [embeds['message'].message_embed("pong !")], ephemeral: true });
    }
};