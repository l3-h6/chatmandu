const { Events, ActivityType } = require("discord.js");

let status = [
  {
    name: ".gg/chatmandu",
    type: ActivityType.Watching,
  },
  {
    name: "the game she played with me",
    type: ActivityType.Playing,
  },
  {
    name: "with your mom",
    type: ActivityType.Playing,
  },
  {
    name: "with her boobies",
    type: ActivityType.Playing,
  },
  {
    name: "Killing in the Name of",
    type: ActivityType.Listening,
  },
];

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    setInterval(() => {
      let random = Math.floor(Math.random() * status.length);
      client.user.setActivity(status[random]);
    }, 60000);
  },
};
