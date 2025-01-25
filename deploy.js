require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { clientId, token } = process.env;
const fs = require('node:fs');
const path = require('node:path');

function deploy() {
	const globalCommands = [];
	const globalfoldersPath = path.join(__dirname, 'commands');
	const globalcommandFolders = fs.readdirSync(globalfoldersPath);

	for (const folder of globalcommandFolders) {
		const commandsPath = path.join(globalfoldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				globalCommands.push(command.data.toJSON());
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}

	const rest = new REST().setToken(token);

	(async () => {
		try {
			console.log(`Started refreshing ${globalCommands.length} application (/) commands.`);
			const existingCommands = await rest.get(Routes.applicationCommands(clientId));
			for (const command of existingCommands) {
				await rest.delete(Routes.applicationCommand(clientId, command.id));
			}
			const data = await rest.put(
				Routes.applicationCommands(clientId),
				{ body: globalCommands },
			);

			console.log(`Successfully reloaded ${data.length} application (/) commands.`);
		} catch (error) {
			console.error(error);
		}
	})();
}

module.exports = { deploy };