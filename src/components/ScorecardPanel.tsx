// src/components/ScorecardPanel.tsx

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  formatVsPar,
  getPlayerHoleDisplayScore,
  getPlayerTotalScore,
  getPlayerTotalVsPar,
} from "../game/engine";
import type { RoundState } from "../game/types";

type ScorecardPanelProps = {
  round: RoundState;
};

export function ScorecardPanel({ round }: ScorecardPanelProps) {
  const holes = [...round.course.holes].sort((a, b) => a.holeNumber - b.holeNumber);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Scorecard</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.playerCell]}>Player</Text>
            {holes.map((hole) => (
              <Text key={hole.holeNumber} style={styles.cell}>
                {hole.holeNumber}
              </Text>
            ))}
            <Text style={styles.cell}>Total</Text>
            <Text style={styles.cell}>Vs Par</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.cell, styles.playerCell]}>Par</Text>
            {holes.map((hole) => (
              <Text key={hole.holeNumber} style={styles.cell}>
                {hole.par}
              </Text>
            ))}
            <Text style={styles.cell}>
              {holes.reduce((total, hole) => total + hole.par, 0)}
            </Text>
            <Text style={styles.cell}>-</Text>
          </View>

          {round.players.map((player) => {
            const total = getPlayerTotalScore(round, player.id);
            const vsPar = getPlayerTotalVsPar(round, player.id);

            return (
              <View key={player.id} style={styles.row}>
                <Text style={[styles.cell, styles.playerCell]}>{player.name}</Text>

                {holes.map((hole) => {
                  const score = getPlayerHoleDisplayScore(round, player.id, hole.holeNumber);

                  return (
                    <Text key={hole.holeNumber} style={styles.cell}>
                      {score ?? "-"}
                    </Text>
                  );
                })}

                <Text style={styles.cell}>{total}</Text>
                <Text style={styles.cell}>{formatVsPar(vsPar)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe5d5",
    gap: 10,
  },
  title: {
    color: "#17351f",
    fontSize: 18,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 64,
    minHeight: 34,
    padding: 8,
    borderWidth: 1,
    borderColor: "#dbe5d5",
    color: "#17351f",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  playerCell: {
    width: 112,
    textAlign: "left",
  },
});
