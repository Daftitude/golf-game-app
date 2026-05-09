// src/components/RoundControlBar.tsx

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ActionButton } from "./ActionButton";

type RoundControlBarProps = {
  currentHoleNumber: number;
  totalHoles: number;
  scorecardOpen: boolean;
  onPreviousHole: () => void;
  onFinishHole: () => void;
  onNextHole: () => void;
  onToggleScorecard: () => void;
  onEndRound: () => void;
};

export function RoundControlBar({
  currentHoleNumber,
  totalHoles,
  scorecardOpen,
  onPreviousHole,
  onFinishHole,
  onNextHole,
  onToggleScorecard,
  onEndRound,
}: RoundControlBarProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.holeCount}>
        Hole {currentHoleNumber} of {totalHoles}
      </Text>

      <View style={styles.actions}>
        <ActionButton label="Previous Hole" variant="secondary" compact onPress={onPreviousHole} />
        <ActionButton label="Finish Hole" compact onPress={onFinishHole} />
        <ActionButton label="Next Hole" variant="secondary" compact onPress={onNextHole} />
        <ActionButton
          label={scorecardOpen ? "Hide Scorecard" : "Scorecard"}
          variant="light"
          compact
          onPress={onToggleScorecard}
        />
        <ActionButton label="End Round" variant="danger" compact onPress={onEndRound} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe5d5",
    gap: 10,
  },
  holeCount: {
    color: "#17351f",
    fontSize: 15,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
