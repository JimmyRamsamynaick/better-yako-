const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../embeds/message_embed');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Renvoie pong'),
	async execute(interaction) {
		try {
			// Crée un embed avec tous les arguments requis
			const embed = embeds.message_embed("Pong !", "Voici la réponse du bot.", "#00FF00");
			await interaction.reply({ embeds: [embed], ephemeral: false });
		} catch (error) {
			console.error('Erreur dans la commande /ping :', error);
			await interaction.reply({
				content: "Une erreur est survenue lors de l'exécution de cette commande.",
				ephemeral: true,
			});
		}
	},
};
