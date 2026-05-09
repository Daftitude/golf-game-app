// src/screens/RoundScreen.tsx

import React from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { ActionButton } from "../components/ActionButton";
import { BallAvatarMarker } from "../components/BallAvatarMarker";
import { HoleMap } from "../components/HoleMap";
import { RoundControlBar } from "../components/RoundControlBar";
import { ScorecardPanel } from "../components/ScorecardPanel";
import {
  areAllPlayerBallsUnavailable,
  formatVsPar,
  getCurrentHole,
  getGameModeDefinition,
  getPlayerTotalScore,
  getPlayerTotalVsPar,
  recommendClubs,
} from "../game/engine";
import { useRoundStore } from "../store/useRoundStore";
import type { BallState, Player, PlayerHoleState, RoundState, ShotOutcomeType } from "../game/types";

const GOOD_SHOTS: Array<{ label: string; outcomeType: ShotOutcomeType }> = [
  { label: "Good Center", outcomeType: "good-center" },
  { label: "Good Left", outcomeType: "good-left" },
  { label: "Good Right", outcomeType: "good-right" },
];

const BAD_CONTACT: Array<{ label: string; outcomeType: ShotOutcomeType }> = [
  { label: "Short", outcomeType: "short-center" },
  { label: "Topped Center", outcomeType: "topped-center" },
  { label: "Topped Left", outcomeType: "topped-left" },
  { label: "Topped Right", outcomeType: "topped-right" },
];

const TROUBLE_DROP: Array<{ label: string; outcomeType: ShotOutcomeType }> = [
  { label: "Out Left", outcomeType: "out-left" },
  { label: "Out Right", outcomeType: "out-right" },
  { label: "Drop Avg", outcomeType: "drop-average" },
  { label: "Random Drop", outcomeType: "random-drop" },
];

function formatLateral(offset: number) {
  if (Math.abs(offset) < 5) return "center";
  return offset < 0 ? `${Math.abs(offset)} yd left` : `${offset} yd right`;
}

function ShotGroup(props: {
  title: string;
  actions: Array<{ label: string; outcomeType: ShotOutcomeType }>;
  onPress: (outcomeType: ShotOutcomeType) => void;
  getDisabled?: (outcomeType: ShotOutcomeType) => boolean;
}) {
  return (
    <View style={styles.shotGroup}>
      <Text style={styles.shotGroupTitle}>{props.title}</Text>

      <View style={styles.shotButtons}>
        {props.actions.map((action) => (
          <ActionButton
            key={action.outcomeType}
            label={action.label}
            variant={action.outcomeType.includes("out") ? "danger" : "secondary"}
            compact
            disabled={props.getDisabled?.(action.outcomeType)}
            onPress={() => props.onPress(action.outcomeType)}
          />
        ))}
      </View>
    </View>
  );
}

function BallCard(props: {
  round: RoundState;
  player: Player;
  playerHole: PlayerHoleState;
  ball: BallState;
}) {
  const applyShotOutcome = useRoundStore((state) => state.applyShotOutcome);
  const playerRound = props.round.playerRoundStates[props.player.id];
  const allUnavailable = areAllPlayerBallsUnavailable(props.playerHole);

  const recommendations = recommendClubs(
    props.player,
    props.ball.remainingDistanceYards,
    props.ball.lie,
    props.round.settings.gameMode,
    2,
  );

  const topClub = recommendations[0]?.club;
  const isPlayable = props.ball.playableState === "playable";

  function handleOutcome(outcomeType: ShotOutcomeType) {
    applyShotOutcome({
      playerId: props.player.id,
      ballNumber: props.ball.ballNumber,
      outcomeType,
      clubId:
        outcomeType === "drop-average" || outcomeType === "random-drop"
          ? undefined
          : topClub?.id,
    });
  }

  function isDisabled(outcomeType: ShotOutcomeType) {
    const isDrop = outcomeType === "drop-average" || outcomeType === "random-drop";

    if (outcomeType === "random-drop" && !props.round.settings.allowRandomDrop) {
      return true;
    }

    if (isDrop) {
      return (
        props.ball.playableState === "holed" ||
        playerRound.dropsRemaining === 0 ||
        (props.ball.playableState === "playable" && !allUnavailable)
      );
    }

    return !isPlayable;
  }

  return (
    <View style={styles.ballCard}>
      <View style={styles.ballHeader}>
        <View style={styles.ballTitleRow}>
          <BallAvatarMarker avatar={props.ball.avatar} playableState={props.ball.playableState} />
          <View>
            <Text style={styles.ballTitle}>
              Ball {props.ball.avatar.numberLabel}: {props.ball.avatar.name}
            </Text>
            <Text style={styles.ballMeta}>
              {props.ball.playableState} - {props.ball.lie}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statGrid}>
        <Text style={styles.stat}>From tee: {props.ball.mapPosition.distanceFromTeeYards} yd</Text>
        <Text style={styles.stat}>Remaining: {props.ball.remainingDistanceYards} yd</Text>
        <Text style={styles.stat}>Lateral: {formatLateral(props.ball.mapPosition.lateralOffsetYards)}</Text>
        <Text style={styles.stat}>
          Strokes {props.ball.strokes} - Penalties {props.ball.penalties}
        </Text>
      </View>

      {topClub ? (
        <Text style={styles.recommendation}>
          Recommended: {topClub.name} - avg {topClub.averageDistanceYards} yd - confidence{" "}
          {recommendations[0].confidenceScore}
        </Text>
      ) : (
        <Text style={styles.recommendation}>No club profile available.</Text>
      )}

      <ShotGroup
        title="Good Shots"
        actions={GOOD_SHOTS}
        onPress={handleOutcome}
        getDisabled={isDisabled}
      />

      <ShotGroup
        title="Bad Contact"
        actions={BAD_CONTACT}
        onPress={handleOutcome}
        getDisabled={isDisabled}
      />

      <ShotGroup
        title="Trouble / Drop"
        actions={TROUBLE_DROP}
        onPress={handleOutcome}
        getDisabled={isDisabled}
      />

      <View style={styles.history}>
        <Text style={styles.historyTitle}>Recent history</Text>

        {props.ball.events.length === 0 ? (
          <Text style={styles.historyText}>No shots yet.</Text>
        ) : (
          props.ball.events
            .slice(-3)
            .reverse()
            .map((event) => (
              <Text key={event.id} style={styles.historyText}>
                {props.ball.avatar.emoji} {event.type}: {event.outcomeType ?? "event"} -{" "}
                {event.shotDistanceYards} yd - {event.remainingDistanceAfterYards} yd left
              </Text>
            ))
        )}
      </View>
    </View>
  );
}

export function RoundScreen() {
  const { width } = useWindowDimensions();
  const round = useRoundStore((state) => state.round);
  const error = useRoundStore((state) => state.error);
  const scorecardOpen = useRoundStore((state) => state.scorecardOpen);
  const finishCurrentHole = useRoundStore((state) => state.finishCurrentHole);
  const nextHole = useRoundStore((state) => state.nextHole);
  const previousHole = useRoundStore((state) => state.previousHole);
  const toggleScorecard = useRoundStore((state) => state.toggleScorecard);
  const endRound = useRoundStore((state) => state.endRound);

  if (!round) return null;

  const hole = getCurrentHole(round);
  const mode = getGameModeDefinition(round.settings.gameMode);
  const useColumns = width >= 860;

  function confirmEndRound() {
    Alert.alert("End round?", "This will return to the setup screen.", [
      { text: "Cancel", style: "cancel" },
      { text: "End Round", style: "destructive", onPress: endRound },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <HoleMap round={round} />

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

        {round.notices.slice(-3).map((notice) => (
          <Text key={notice.id} style={styles.warning}>
            {notice.message}
          </Text>
        ))}

        {scorecardOpen ? <ScorecardPanel round={round} /> : null}

        <View style={styles.holeInfo}>
          <Text style={styles.holeTitle}>Hole Details</Text>
          <Text style={styles.holeText}>
            Mode: {mode.title} - Shape: {hole.shape} - HCP {hole.handicap}
          </Text>
          <Text style={styles.holeText}>{hole.notes}</Text>
        </View>

        <View style={styles.playerGrid}>
          {round.players.map((player) => {
            const playerHole = round.holeStates[round.currentHoleNumber][player.id];
            const playerRound = round.playerRoundStates[player.id];
            const totalScore = getPlayerTotalScore(round, player.id);
            const totalVsPar = getPlayerTotalVsPar(round, player.id);

            return (
              <View key={player.id} style={[styles.playerCard, useColumns && styles.playerCardColumn]}>
                <View style={styles.playerHeader}>
                  <View>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerMeta}>
                      Score {totalScore || "-"} - {formatVsPar(totalVsPar)}
                    </Text>
                  </View>

                  <Text style={styles.playerStatus}>
                    {playerHole.holeComplete ? "Complete" : "In progress"}
                  </Text>
                </View>

                <View style={styles.playerStats}>
                  <Text style={styles.playerStat}>Swings: {playerRound.totalStrokesHit}</Text>
                  <Text style={styles.playerStat}>Penalties: {playerRound.totalPenalties}</Text>
                  {playerRound.dropsRemaining !== null ? (
                    <Text style={styles.playerStat}>Drops: {playerRound.dropsRemaining}</Text>
                  ) : null}
                </View>

                {playerHole.balls.map((ball) => (
                  <BallCard
                    key={ball.ballNumber}
                    round={round}
                    player={player}
                    playerHole={playerHole}
                    ball={ball}
                  />
                ))}
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
  error: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffe8e8",
    color: "#9d1c1c",
    fontWeight: "800",
  },
  warning: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff7d8",
    color: "#765c00",
    fontWeight: "800",
  },
  holeInfo: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe5d5",
    gap: 5,
  },
  holeTitle: {
    color: "#17351f",
    fontSize: 18,
    fontWeight: "900",
  },
  holeText: {
    color: "#526258",
    fontSize: 13,
    lineHeight: 19,
  },
  playerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
  },
  playerCard: {
    width: "100%",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe5d5",
    gap: 12,
  },
  playerCardColumn: {
    width: "48.5%",
  },
  playerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  playerName: {
    color: "#17351f",
    fontSize: 22,
    fontWeight: "900",
  },
  playerMeta: {
    color: "#526258",
    fontSize: 13,
    fontWeight: "700",
  },
  playerStatus: {
    color: "#245c36",
    fontSize: 12,
    fontWeight: "900",
  },
  playerStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerStat: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#e9efe4",
    color: "#17351f",
    fontSize: 12,
    fontWeight: "800",
  },
  ballCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f8faf4",
    borderWidth: 1,
    borderColor: "#dbe5d5",
    gap: 10,
  },
  ballHeader: {
    gap: 8,
  },
  ballTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ballTitle: {
    color: "#17351f",
    fontSize: 16,
    fontWeight: "900",
  },
  ballMeta: {
    color: "#526258",
    fontSize: 12,
    fontWeight: "800",
  },
  statGrid: {
    gap: 4,
  },
  stat: {
    color: "#344238",
    fontSize: 13,
    fontWeight: "700",
  },
  recommendation: {
    color: "#245c36",
    fontSize: 13,
    fontWeight: "900",
  },
  shotGroup: {
    gap: 6,
  },
  shotGroupTitle: {
    color: "#17351f",
    fontSize: 13,
    fontWeight: "900",
  },
  shotButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  history: {
    gap: 4,
    paddingTop: 4,
  },
  historyTitle: {
    color: "#17351f",
    fontSize: 13,
    fontWeight: "900",
  },
  historyText: {
    color: "#526258",
    fontSize: 12,
    lineHeight: 17,
  },
});
