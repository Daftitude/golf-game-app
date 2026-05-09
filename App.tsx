// App.tsx
// Main app router.
// This file decides which screen to show based on the current round mode.

import React from "react";

import { BasicScoreScreen } from "./src/screens/BasicScoreScreen";
import { RoundScreen } from "./src/screens/RoundScreen";
import { SetupScreen } from "./src/screens/SetupScreen";
import { useRoundStore } from "./src/store/useRoundStore";

export default function App() {
  const round = useRoundStore((state) => state.round);

  // No active round = show the game mode setup screen.
  if (!round) {
    return <SetupScreen />;
  }

  // Basic Golf Game = simple scorecard screen.
  if (round.settings.basicScoringOnly) {
    return <BasicScoreScreen />;
  }

  // Everything else = advanced round screen.
  return <RoundScreen />;
}