const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("law")
    .setDescription("Replies with the constitution!"),
  async execute(interaction) {
    const constitutionEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle(":scroll: The Constitution of Chatmandu")
      .setDescription(
        "**Preamble**\nWe, the members of Chatmandu, establish this Constitution to create order, fairness, and fun in our community."
      )
      .addFields(
        {
          name: ":classical_building: I. The Executive Council",
          value:
            "1. Elections will be held every **45 days**.\n" +
            "2. All members may vote.\n" +
            "3. The **highest-voted candidate** becomes the **Prime Minister**.\n" +
            "4. The next **four top-voted candidates** become **Ministers**.\n" +
            "5. Together, they form the **Executive Council**.\n" +
            "6. The Executive Council shall run the server, manage events, and propose new laws.\n" +
            "7. Laws may be added to this Constitution with a **majority vote** within the Executive Council."
        },
        {
          name: ":scales: II. The Judiciary Council",
          value:
            "1. The **Judiciary Council** is a permanent body that oversees the Executive.\n" +
            "2. It is composed of:\n" +
            "   • The **Dictator**\n" +
            "   • The **Archduke**\n" +
            "   • The **Pope**\n" +
            "   • The **Archbishop**\n" +
            "3. The Judiciary Council has the power to **veto any law or decision** made by the Executive.\n" +
            "4. The Judiciary ensures fairness, balance, and adherence to this Constitution."
        },
        {
          name: ":pushpin: III. Baseline Rules (Unchangeable)",
          value:
            "1. NSFW content is prohibited unless in designated channels.\n" +
            "2. Follow Discord’s **Terms of Service** and **Community Guidelines**.\n" +
            "3. The Constitution itself cannot be removed or replaced, only amended."
        },
        {
          name: ":ballot_box: IV. Elections & Governance",
          value:
            "1. Elections are held in a fair, transparent manner by community vote.\n" +
            "2. Members may campaign respectfully.\n" +
            "3. Once elected, Executive Council members serve **45 days** until the next election.\n" +
            "4. After each election, power is peacefully transferred to the new Executive."
        },
        {
          name: ":crossed_swords: V. Amendments",
          value:
            "1. Amendments may be proposed by the Executive Council.\n" +
            "2. An amendment passes with **Executive majority approval**.\n" +
            "3. The Judiciary Council may **approve or veto** the amendment.\n" +
            "4. Once approved, the amendment becomes part of this Constitution."
        }
      )
      .setFooter({ text: "Chatmandu Nepal" });

    await interaction.reply({ embeds: [constitutionEmbed] });
  },
};
