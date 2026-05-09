// src/data/sampleData.ts

import type { Course, Player } from "../game/types";

export const sampleCourse: Course = {
  id: "sample-course",
  name: "Starter Hills Golf Club",
  location: "Local Test Course",
  source: "manual",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  holes: [
    {
      holeNumber: 1,
      par: 4,
      handicap: 7,
      teeDistances: {
        blue: 410,
        white: 382,
        red: 305,
      },
      shape: "dogleg-right",
      hazards: [
        {
          id: "h1-water-right",
          type: "water",
          name: "Right pond",
          side: "right",
          distanceFromTeeYards: 240,
          notes: "Avoid aggressive driver miss right.",
        },
      ],
      notes: "Opening hole bends right after the landing zone.",
      strategyTips: [
        "Favor the left center of the fairway.",
        "A 220-yard tee shot leaves a comfortable approach.",
      ],
      photoUris: [],
    },
    {
      holeNumber: 2,
      par: 3,
      handicap: 15,
      teeDistances: {
        blue: 172,
        white: 148,
        red: 112,
      },
      shape: "straight",
      hazards: [
        {
          id: "h2-front-bunker",
          type: "bunker",
          name: "Front bunker",
          side: "short",
          distanceFromTeeYards: 130,
        },
      ],
      notes: "Short par 3 with trouble short.",
      strategyTips: ["Take enough club to carry the front bunker."],
      photoUris: [],
    },
    {
      holeNumber: 3,
      par: 5,
      handicap: 3,
      teeDistances: {
        blue: 535,
        white: 502,
        red: 421,
      },
      shape: "split-fairway",
      hazards: [
        {
          id: "h3-trees-left",
          type: "trees",
          name: "Left trees",
          side: "left",
          distanceFromTeeYards: 220,
        },
      ],
      notes: "Risk/reward second shot depending on tee ball.",
      strategyTips: [
        "Right fairway gives the better angle.",
        "Lay up to 100 yards if blocked out.",
      ],
      photoUris: [],
    },
  ],
};

export const samplePlayers: Player[] = [
  {
    id: "player-alex",
    name: "Alex",
    preferredTeeBox: "white",
    clubProfile: [
      { id: "alex-driver", name: "Driver", type: "driver", averageDistanceYards: 245 },
      { id: "alex-3w", name: "3 Wood", type: "wood", averageDistanceYards: 220 },
      { id: "alex-5i", name: "5 Iron", type: "iron", averageDistanceYards: 175 },
      { id: "alex-7i", name: "7 Iron", type: "iron", averageDistanceYards: 150 },
      { id: "alex-pw", name: "Pitching Wedge", type: "wedge", averageDistanceYards: 115 },
      { id: "alex-sw", name: "Sand Wedge", type: "wedge", averageDistanceYards: 80 },
      { id: "alex-putter", name: "Putter", type: "putter", averageDistanceYards: 10 },
    ],
  },
  {
    id: "player-sam",
    name: "Sam",
    preferredTeeBox: "white",
    clubProfile: [
      { id: "sam-driver", name: "Driver", type: "driver", averageDistanceYards: 210 },
      { id: "sam-5w", name: "5 Wood", type: "wood", averageDistanceYards: 185 },
      { id: "sam-6i", name: "6 Iron", type: "iron", averageDistanceYards: 145 },
      { id: "sam-8i", name: "8 Iron", type: "iron", averageDistanceYards: 120 },
      { id: "sam-pw", name: "Pitching Wedge", type: "wedge", averageDistanceYards: 95 },
      { id: "sam-sw", name: "Sand Wedge", type: "wedge", averageDistanceYards: 65 },
      { id: "sam-putter", name: "Putter", type: "putter", averageDistanceYards: 10 },
    ],
  },
];
