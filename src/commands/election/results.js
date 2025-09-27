const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('election-results')
    .setDescription('Get the results of an election')
    .addStringOption(option =>
      option.setName('election-id')
        .setDescription('The ID of the election to get results for')
        .setRequired(true)),
  async execute(interaction) {
    const electionId = interaction.options.getString('election-id');
    const electionManager = interaction.client.electionManager;

    const results = electionManager.getElectionResults(electionId);
    if (!results) {
      return interaction.reply({
        content: `❌ Election \`${electionId}\` not found.`,
        ephemeral: true
      });
    }

    const embed = {
      title: `📊 Election Results: ${results.title}`,
      color: results.isActive ? 0x00ff00 : 0xff0000,
      fields: [
        {
          name: '📈 Vote Count',
          value: results.options.map(option =>
            `${option.emoji} ${option.text}: **${option.votes}** votes`
          ).join('\n'),
          inline: false
        },
        {
          name: '📊 Statistics',
          value: `Total Votes: **${results.totalVotes}**\nUnique Voters: **${results.voters.length}**\nStatus: **${results.isActive ? 'ACTIVE' : 'ENDED'}**`,
          inline: false
        }
      ],
      footer: {
        text: `Election ID: ${electionId}`
      },
      timestamp: new Date()
    };

    if (!results.isActive && results.totalVotes > 0) {
      const winner = results.options.reduce((prev, current) =>
        prev.votes > current.votes ? prev : current
      );
      embed.fields.push({
        name: '🏆 Winner',
        value: `${winner.emoji} **${winner.text}** with ${winner.votes} votes`,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
