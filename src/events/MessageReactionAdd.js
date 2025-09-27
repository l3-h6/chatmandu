const ElectionManager = require('../utils/electionManager');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user, client) {
    if (user.bot) return;

    const message = reaction.message;
    const electionId = message.embeds?.[0]?.footer?.text?.match(/Election ID: (.+)/)?.[1];

    if (!electionId) return;

    const electionManager = client.electionManager;
    const election = electionManager.elections.get(electionId);
    if (!election) return;

    try {
      const optionIndex = election.options.findIndex(opt => opt.emoji === reaction.emoji.name);
      if (optionIndex === -1) {
        await reaction.users.remove(user.id);
        return;
      }

      const optionId = election.options[optionIndex].id;
      const result = electionManager.castVote(user, electionId, optionId);

      if (!result.success) {
        await reaction.users.remove(user.id);

        const feedbackMessage = await message.channel.send({
          content: `❌ **Vote Rejected**\n**User:** ${user}\n**Reason:** ${result.reason}`,
          allowedMentions: { users: [user.id] }
        });

        setTimeout(() => {
          feedbackMessage.delete().catch(console.error);
        }, 10000);

        return;
      }

      await updateElectionMessage(message, electionId, electionManager);
      console.log(`✅ Vote cast: ${user.username} voted for option ${optionId} in election ${electionId}`);

    } catch (error) {
      console.error('Error handling election reaction:', error);
      await reaction.users.remove(user.id);
    }
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
