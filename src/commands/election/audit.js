const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('election-audit')
    .setDescription('Get the audit trail for an election')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('election-id')
        .setDescription('The ID of the election to audit')
        .setRequired(true)),
  async execute(interaction) {
    const electionId = interaction.options.getString('election-id');
    const electionManager = interaction.client.electionManager;

    const audit = electionManager.getAuditTrail(electionId);
    if (!audit) {
      return interaction.reply({
        content: `❌ Election \`${electionId}\` not found.`,
        ephemeral: true
      });
    }

    const auditData = JSON.stringify(audit, null, 2);
    const fileName = `audit_${electionId}_${Date.now()}.json`;

    await fs.writeFile(fileName, auditData);

    await interaction.reply({
      content: `📋 **Audit Trail for Election: ${audit.title}**\n\n` +
        `**Summary:**\n` +
        `• Total Votes: ${audit.totalVotes}\n` +
        `• Unique Voters: ${audit.uniqueVoters}\n` +
        `• Duration: ${audit.startTime.toLocaleString()} - ${audit.endTime.toLocaleString()}\n` +
        `• Status: ${audit.status}\n\n` +
        `📄 Detailed audit log attached.`,
      files: [{
        attachment: fileName,
        name: fileName
      }],
      ephemeral: true
    });

    setTimeout(() => {
      fs.unlink(fileName).catch(console.error);
    }, 60000);
  },
};
