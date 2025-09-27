const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('end-election')
    .setDescription('End an active election')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('election-id')
        .setDescription('The ID of the election to end')
        .setRequired(true)),
  async execute(interaction) {
    const electionId = interaction.options.getString('election-id');
    const electionManager = interaction.client.electionManager;

    const success = electionManager.endElection(electionId);
    if (success) {
      await interaction.reply({
        content: `✅ Election \`${electionId}\` ended successfully.`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `❌ Election \`${electionId}\` not found.`,
        ephemeral: true
      });
    }
  },
};
