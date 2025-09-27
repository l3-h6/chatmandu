const fs = require('fs').promises;
const path = require('path');

class ElectionManager {
  constructor() {
    this.elections = new Map();
    this.voteLog = new Map();
    this.voteFile = './election_data.json';
    this.loadElectionData();
  }

  async loadElectionData() {
    try {
      const data = await fs.readFile(this.voteFile, 'utf8');
      const parsed = JSON.parse(data);

      if (parsed.elections) {
        for (const [id, election] of Object.entries(parsed.elections)) {
          this.elections.set(id, {
            ...election,
            startTime: new Date(election.startTime),
            endTime: new Date(election.endTime)
          });
        }
      }

      if (parsed.voteLog) {
        this.voteLog = new Map(Object.entries(parsed.voteLog));
      }

      console.log('✅ Election data loaded successfully');
    } catch (error) {
      console.log('📝 No existing election data found, starting fresh');
    }
  }

  async saveElectionData() {
    try {
      const data = {
        elections: Object.fromEntries(this.elections),
        voteLog: Object.fromEntries(this.voteLog)
      };
      await fs.writeFile(this.voteFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Error saving election data:', error);
    }
  }

  createElection(electionId, title, description, options, durationHours = 24) {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (durationHours * 60 * 60 * 1000));

    const election = {
      id: electionId,
      title,
      description,
      options: options.map((opt, index) => ({
        id: index + 1,
        text: opt,
        emoji: this.getOptionEmoji(index),
        votes: 0
      })),
      startTime,
      endTime,
      status: 'active',
      totalVotes: 0,
      voters: new Set(),
      voteHistory: []
    };

    this.elections.set(electionId, election);
    this.saveElectionData();
    return election;
  }

  getOptionEmoji(index) {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return emojis[index] || '❓';
  }

  canUserVote(user, electionId) {
    const election = this.elections.get(electionId);
    if (!election) return { canVote: false, reason: 'Election not found' };

    if (election.status !== 'active') {
      return { canVote: false, reason: 'Election is not active' };
    }

    if (new Date() > election.endTime) {
      return { canVote: false, reason: 'Election has ended' };
    }

    if (election.voters.has(user.id)) {
      return { canVote: false, reason: 'You have already voted' };
    }

    const accountAge = Date.now() - user.createdTimestamp;
    const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000;
    if (accountAge < sixMonthsInMs) {
      return { canVote: false, reason: 'Account must be 6+ months old' };
    }

    return { canVote: true };
  }

  castVote(user, electionId, optionId) {
    const election = this.elections.get(electionId);
    if (!election) return { success: false, reason: 'Election not found' };

    const canVote = this.canUserVote(user, electionId);
    if (!canVote.canVote) {
      return { success: false, reason: canVote.reason };
    }

    const option = election.options.find(opt => opt.id === optionId);
    if (!option) {
      return { success: false, reason: 'Invalid option' };
    }

    option.votes++;
    election.totalVotes++;
    election.voters.add(user.id);

    const voteRecord = {
      userId: user.id,
      username: user.username,
      discriminator: user.discriminator,
      electionId,
      optionId,
      optionText: option.text,
      timestamp: new Date().toISOString(),
      userCreatedAt: user.createdAt.toISOString(),
      accountAge: Date.now() - user.createdTimestamp
    };

    election.voteHistory.push(voteRecord);

    if (!this.voteLog.has(user.id)) {
      this.voteLog.set(user.id, []);
    }
    this.voteLog.get(user.id).push(voteRecord);

    this.saveElectionData();
    return { success: true, voteRecord };
  }

  getElectionResults(electionId) {
    const election = this.elections.get(electionId);
    if (!election) return null;

    return {
      ...election,
      voters: Array.from(election.voters),
      isActive: election.status === 'active' && new Date() <= election.endTime
    };
  }

  endElection(electionId) {
    const election = this.elections.get(electionId);
    if (!election) return false;

    election.status = 'ended';
    this.saveElectionData();
    return true;
  }

  getAuditTrail(electionId) {
    const election = this.elections.get(electionId);
    if (!election) return null;

    return {
      electionId,
      title: election.title,
      totalVotes: election.totalVotes,
      uniqueVoters: election.voters.size,
      voteHistory: election.voteHistory,
      startTime: election.startTime,
      endTime: election.endTime,
      status: election.status
    };
  }

  getAllElections() {
    return Array.from(this.elections.values());
  }

  getActiveElections() {
    return this.getAllElections().filter(election =>
      election.status === 'active' && new Date() <= election.endTime
    );
  }
}

module.exports = ElectionManager;
