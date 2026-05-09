// src/screens/BasicScoreScreen.tsx

import React from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { ActionButton } from "../components/ActionButton";
import { RoundControlBar } from "../components/RoundControlBar";
import { ScorecardPanel } from "../components/ScorecardPanel";
import {
  formatVsPar,
  getBasicScoreLabel,
  getCurrentHole,
  getHoleDistance,
  getPlayerTotalScore,
  getPlayerTotalVsPar,
} from "../game/engine";
import { useRoundStore } from "../store/useRoundStore";

export function BasicScoreScreen() {
  const { width } = useWindowDimensions();
  const round = useRoundStore((state) => state.round);
  const error = useRoundStore((state) => state.error);
  const scorecardOpen = useRoundStore((state) => state.scorecardOpen);
  const adjustBasicScore = useRoundStore((state) => state.adjustBasicScore);
  const finishCurrentHole = useRoundStore((state) => state.finishCurrentHole);
  const nextHole = useRoundStore((state) => state.nextHole);
  const previousHole = useRoundStore((state) => state.previousHole);
  const toggleScorecard = useRoundStore((state) => state.toggleScorecard);
  const endRound = useRoundStore((state) => state.endRound);

  if (!round) return null;

  const hole = getCurrentHole(round);
  const holeDistance = getHoleDistance(hole, round.teeBox);
  const useColumns = width >= 720;

  function confirmEndRound() {
    Alert.alert("End round?", "This will return to the setup screen.", [
      { text: "Cancel", style: "cancel" },
      { text: "End Round", style: "destructive", onPress: endRound },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.mode}>Basic Golf Game</Text>
          <Text style={styles.title}>
            Hole {hole.holeNumber} - Par {hole.par}
          </Text>
          <Text style={styles.subtitle}>
            {round.teeBox} tees - {holeDistance} yards - HCP {hole.handicap} - {hole.shape}
          </Text>
        </View>

        <RoundControlBar
          currentHoleNumber={round.currentHoleNumber}
          totalHoles={round.course.holes.length}
          scorecardOpen={scorecardOpen}
          onPreviousHole={previousHole}
          onFinishHole={finishCurrentHole}
          onNextHole={nextHole}
          onToggleScorecard={toggleScorecard}
          onEndRound={confirmEndRound}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {scorecardOpen ? <ScorecardPanel round={round} /> : null}

        <View style={styles.playerGrid}>
          {round.players.map((player) => {
            const scoreEntry = round.basicScores[player.id].scoresByHole[hole.holeNumber];
            const label = getBasicScoreLabel(scoreEntry.score, hole.par);
            const totalScore = getPlayerTotalScore(round, player.id);
            const totalVsPar = getPlayerTotalVsPar(round, player.id);

            return (
              <View key={player.id} style={[styles.playerCard, useColumns && styles.playerCardColumn]}>
                <View>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerMeta}>
                    Total {totalScore} - {formatVsPar(totalVsPar)}
                  </Text>
                </View>

                <View style={styles.scoreRow}>
                  <ActionButton
                    label="-"
                    variant="light"
                    compact
                    onPress={() =>
                      adjustBasicScore({
                        playerId: player.id,
                        holeNumber: hole.holeNumber,
                        delta: -1,
                      })
                    }
                  />

                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreNumber}>{scoreEntry.score}</Text>
                    <Text style={styles.scoreLabel}>{label}</Text>
                  </View>

                  <ActionButton
                    label="+"
                    variant="light"
                    compact
                    onPress={() =>
                      adjustBasicScore({
                        playerId: player.id,
                        holeNumber: hole.holeNumber,
                        delta: 1,
                      })
                    }
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f7f2",
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#17351f",
    gap: 5,
  },
  mode: {
    color: "#cbd9c4",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: "#edf4e9",
    fontSize: 14,
    fontWeight: "700",
  },
  error: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffe8e8",
    color: "#9d1c1c",
    fontWeight: "800",
  },
  playerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
  },
  playerCard: {
    width: "100%",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe5d5",
    gap: 16,
  },
  playerCardColumn: {
    width: "48.5%",
  },
  playerName: {
    color: "#17351f",
    fontSize: 22,
    fontWeight: "900",
  },
  playerMeta: {
    color: "#526258",
    fontSize: 14,
    fontWeight: "700",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  scoreBox: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f8faf4",
  },
  scoreNumber: {
    color: "#17351f",
    fontSize: 38,
    fontWeight: "900",
  },
  scoreLabel: {
    color: "#55765d",
    fontSize: 14,
    fontWeight: "900",
  },
});
