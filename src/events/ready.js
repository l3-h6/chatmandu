const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		client.user.setPresence({
			activities: [
			  {
				name: 'discord.gg/chatmandu',
				type: 'PLAYING', // Possible types: PLAYING, STREAMING, LISTENING, WATCHING
			  },
			],
			status: 'online', // Possible statuses: online, idle, dnd (do not disturb), invisible
		  });
	},
};