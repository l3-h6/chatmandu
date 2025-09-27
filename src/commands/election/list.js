const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-elections')
    .setDescription('List all active elections'),
  async execute(interaction) {
    const electionManager = interaction.client.electionManager;
    const activeElections = electionManager.getActiveElections();

    if (activeElections.length === 0) {
      return interaction.reply({
        content: '📭 No active elections found.',
        ephemeral: true
      });
    }

    const embed = {
      title: '🗳️ Active Elections',
      color: 0x00ff00,
      fields: activeElections.map(election => ({
        name: election.title,
        value: `ID: \`${election.id}\`\nVotes: ${election.totalVotes}\nEnds: ${election.endTime.toLocaleString()}`,
        inline: true
      })),
      timestamp: new Date()
    };

    await interaction.reply({ embeds: [embed] });
  },
};
