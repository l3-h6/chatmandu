const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-election')
    .setDescription('Create a new election')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('title')
        .setDescription('The title of the election')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('options')
        .setDescription('Election options separated by commas (e.g., "Option 1, Option 2, Option 3")')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in hours (default: 24)')
        .setMinValue(1)
        .setMaxValue(168)), // Max 1 week
  async execute(interaction) {
    const title = interaction.options.getString('title');
    const optionsString = interaction.options.getString('options');
    const duration = interaction.options.getInteger('duration') || 24;

    const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

    if (options.length < 2) {
      return interaction.reply({
        content: '❌ You need at least 2 options for an election.',
        ephemeral: true
      });
    }

    if (options.length > 10) {
      return interaction.reply({
        content: '❌ You can have at most 10 options for an election.',
        ephemeral: true
      });
    }

    const electionManager = interaction.client.electionManager;
    const electionId = `election_${Date.now()}`;
    const election = electionManager.createElection(
      electionId,
      title,
      'React with the emoji of your choice to vote!',
      options,
      duration
    );

    const embed = {
      title: `🗳️ ${election.title}`,
      description: election.description,
      color: 0x00ff00,
      fields: election.options.map(option => ({
        name: `${option.emoji} ${option.text}`,
        value: `**0** votes`,
        inline: true
      })),
      footer: {
        text: `Election ID: ${electionId} | Duration: ${duration} hours | Status: ACTIVE`
      },
      timestamp: new Date()
    };

    const electionMessage = await interaction.reply({
      embeds: [embed],
      fetchReply: true
    });

    for (const option of election.options) {
      await electionMessage.react(option.emoji);
    }

    // Auto-end election after duration
    setTimeout(async () => {
      electionManager.endElection(electionId);
      await updateElectionMessage(electionMessage, electionId, electionManager);
    }, duration * 60 * 60 * 1000);
  },
};

async function updateElectionMessage(message, electionId, electionManager) {
  const election = electionManager.getElectionResults(electionId);
  if (!election) return;

  const embed = {
    title: `🗳️ ${election.title}`,
    description: election.description,
    color: election.isActive ? 0x00ff00 : 0xff0000,
    fields: election.options.map(option => ({
      name: `${option.emoji} ${option.text}`,
      value: `**${option.votes}** votes`,
      inline: true
    })),
    footer: {
      text: `Election ID: ${electionId} | Total Votes: ${election.totalVotes} | Status: ${election.isActive ? 'ACTIVE' : 'ENDED'}`
    },
    timestamp: new Date()
  };

  if (!election.isActive) {
    embed.fields.push({
      name: '🏆 Winner',
      value: election.options.reduce((prev, current) =>
        prev.votes > current.votes ? prev : current
      ).text,
      inline: false
    });
  }

  await message.edit({ embeds: [embed] });
}
