const { Events } = require('discord.js');

async function button(interaction) {
    if (!interaction.isButton()) return;
    await interaction.deferReply({ ephemeral: true });
    const role = interaction.guild.roles.cache.get(interaction.customId);
    if (!role) {
        await interaction.editReply({
            embeds: [
                embeds['error'].error_embed("Le rôle n'existe pas"),
            ],
            ephemeral: true,
        });
        return;
    }
    const hasRole = interaction.member.roles.cache.has(role.id);
    if (hasRole) {
        await interaction.member.roles.remove(role);
        await interaction.editReply({ content: `Le rôle ${role.name} vous a été retiré.` });
    } else {
        await interaction.member.roles.add(role);
        await interaction.editReply({ content: `Le rôle ${role.name} vous a été ajouté.` });
    }
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                console.log(`Commande détectée : ${interaction.commandName}`);
                const command = interaction.client.commands.get(interaction.commandName);

                if (!command) {
                    console.error(`No command matching ${interaction.commandName} was found.`);
                    return;
                }

                await command.execute(interaction);
            } else if (interaction.isButton()) {
                await button(interaction);
            }
        } catch (error) {
            console.error('Erreur lors du traitement de l\'interaction :', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
            }
        }
    },
};
