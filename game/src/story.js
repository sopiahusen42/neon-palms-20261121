// story.js — narrative text: title lore, mission intros/outros and stage barks.
export const STORY = {
  title: "NEON PALMS",
  tagline: "Sunshine. Palm trees. Bad decisions.",
  lore: "1986-ish. Neon Palms is a postcard town with a crime problem — and you just got off the bus with an empty wallet.",
  missions: {
    repo: {
      name: "REPO MAN",
      intro: "Bayside Motors wants their Banshee back. The guy who skipped town left it on the north kerb. Bring it to the docks. Don't scratch it.",
      outro: "The docks boss slides you an envelope. 'Clean work. Mostly.'",
      barks: ["There she is — the red Banshee.", "Nice ride. Now make it disappear.", "Docks garage, south-east. Step on it."],
    },
    delivery: {
      name: "SPECIAL DELIVERY",
      intro: "A package waits at the Palm Diner. It must reach the Sunset Motel while the coffee is still hot. Clock's ticking.",
      outro: "The motel clerk doesn't ask questions. You like this town.",
      barks: ["Package secured. smells like... money.", "Sunset Motel, north-east. Go go go!"],
    },
    heat: {
      name: "HEAT WAVE",
      intro: "Ocean Bank's downtown branch holds a fat deposit box. Walk in, trip the alarm, and outrun every cruiser in the city to the safehouse.",
      outro: "Sirens fade behind you. The safehouse door clicks shut. Rent's paid.",
      barks: ["Alarm's live — the whole city knows your name.", "Safehouse, north-west corner. Break contact!"],
    },
  },
};

export function missionStory(id) { return STORY.missions[id]; }
