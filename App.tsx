// App.tsx

import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  areAllPlayerBallsUnplayable,
  getCurrentHole,
  recommendClubs,
} from "./src/game/engine";
import { sampleCourse, samplePlayers } from "./src/data/sampleData";
import { useRoundStore } from "./src/store/useRoundStore";

import type { BallNumber, LieStatus, RoundState } from "./src/game/types";

function guessLieAfter(beforeYards: number, shotYards: number): LieStatus {
  const remaining = Math.max(0, beforeYards - shotYards);

  if (remaining === 0) return "holed";
  if (remaining <= 20) return "green";
  return "fairway";
}

function findReferenceBall(round: RoundState, currentPlayerId: string) {
  const holeMap = round.holeStates[round.currentHoleNumber];

  for (const player of round.players) {
    if (player.id === currentPlayerId) continue;

    const playerHole = holeMap[player.id];
    const playableBall = playerHole.balls.find(
      (ball) => ball.playableState === "playable",
    );

    if (playableBall) {
      return {
        playerId: player.id,
        playerName: player.name,
        ballNumber: playableBall.ballNumber,
      };
    }
  }

  return null;
}

function SetupScreen() {
  const startRound = useRoundStore((state) => state.startRound);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Golf Game Engine</Text>
        <Text style={styles.subtitle}>
          Logic-first MVP for 3-Ball Golf scoring and strategy.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Start Test Round</Text>

        <ActionButton
          label="Start 3-Ball Round"
          onPress={() =>
            startRound(sampleCourse, samplePlayers, "white", {
              gameMode: "three-ball",
              ballsPerPlayer: 3,
            })
          }
        />

        <ActionButton
          label="Start 1-Ball Drop Practice"
          variant="secondary"
          onPress={() =>
            startRound(sampleCourse, samplePlayers, "white", {
              gameMode: "three-ball",
              ballsPerPlayer: 1,
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}

function RoundScreen() {
  const round = useRoundStore((state) => state.round);
  const error = useRoundStore((state) => state.error);
  const recordShot = useRoundStore((state) => state.recordShot);
  const markBallUnplayable = useRoundStore((state) => state.markBallUnplayable);
  const dropBall = useRoundStore((state) => state.dropBall);
  const nextHole = useRoundStore((state) => state.nextHole);
  const previousHole = useRoundStore((state) => state.previousHole);
  const resetRound = useRoundStore((state) => state.resetRound);

  if (!round) return <SetupScreen />;

  const hole = getCurrentHole(round);
  const holeDistance = hole.teeDistances[round.teeBox];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{round.course.name}</Text>
          <Text style={styles.subtitle}>
            Hole {hole.holeNumber} • Par {hole.par} • {holeDistance} yards
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.navRow}>
          <ActionButton label="Previous" variant="secondary" onPress={previousHole} />
          <ActionButton label="Next" variant="secondary" onPress={nextHole} />
          <ActionButton label="End" variant="danger" onPress={resetRound} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Hole Strategy</Text>
          <Text style={styles.bodyText}>Shape: {hole.shape}</Text>
          {hole.strategyTips.map((tip) => (
            <Text key={tip} style={styles.bodyText}>
              • {tip}
            </Text>
          ))}
        </View>

        {round.players.map((player) => {
          const playerHole = round.holeStates[round.currentHoleNumber][player.id];
          const playerRound = round.playerRoundStates[player.id];
          const canDrop = areAllPlayerBallsUnplayable(playerHole);
          const referenceBall = findReferenceBall(round, player.id);

          return (
            <View key={player.id} style={styles.playerSection}>
              <Text style={styles.playerName}>{player.name}</Text>

              <Text style={styles.metaText}>
                Total swings: {playerRound.totalStrokesHit} • Penalties:{" "}
                {playerRound.totalPenalties}
                {playerRound.dropsRemaining !== null
                  ? ` • Drops left: ${playerRound.dropsRemaining}`
                  : ""}
              </Text>

              {playerHole.balls.map((ball) => {
                const recommendations = recommendClubs(
                  player,
                  ball.remainingDistanceYards,
                  ball.lie,
                  2,
                );

                const topClub = recommendations[0]?.club;
                const smartShotDistance = topClub
                  ? Math.min(topClub.averageDistanceYards, ball.remainingDistanceYards)
                  : Math.min(100, ball.remainingDistanceYards);

                const isPlayable = ball.playableState === "playable";

                return (
                  <View key={ball.ballNumber} style={styles.ballCard}>
                    <View style={styles.ballHeader}>
                      <Text style={styles.ballTitle}>Ball {ball.ballNumber}</Text>
                      <Text style={styles.badge}>{ball.playableState}</Text>
                    </View>

                    <Text style={styles.bodyText}>
                      Remaining: {ball.remainingDistanceYards} yd • Lie: {ball.lie}
                    </Text>

                    <Text style={styles.bodyText}>
                      Strokes: {ball.strokes} • Penalties: {ball.penalties}
                    </Text>

                    {topClub ? (
                      <Text style={styles.recommendation}>
                        Recommended: {topClub.name} ({topClub.averageDistanceYards} yd)
                      </Text>
                    ) : null}

                    <View style={styles.actionGrid}>
                      <ActionButton
                        label="Smart Shot"
                        disabled={!isPlayable}
                        onPress={() =>
                          recordShot({
                            playerId: player.id,
                            ballNumber: ball.ballNumber,
                            clubId: topClub?.id,
                            distanceYards: smartShotDistance,
                            lieAfter: guessLieAfter(
                              ball.remainingDistanceYards,
                              smartShotDistance,
                            ),
                          })
                        }
                      />

                      <ActionButton
                        label="Lay Up 80"
                        variant="secondary"
                        disabled={!isPlayable}
                        onPress={() =>
                          recordShot({
                            playerId: player.id,
                            ballNumber: ball.ballNumber,
                            distanceYards: Math.min(80, ball.remainingDistanceYards),
                            lieAfter: guessLieAfter(
                              ball.remainingDistanceYards,
                              80,
                            ),
                            note: "Conservative layup.",
                          })
                        }
                      />

                      <ActionButton
                        label="Unplayable"
                        variant="danger"
                        disabled={!isPlayable}
                        onPress={() =>
                          markBallUnplayable({
                            playerId: player.id,
                            ballNumber: ball.ballNumber,
                          })
                        }
                      />

                      <ActionButton
                        label="Drop"
                        variant="secondary"
                        disabled={!canDrop || !referenceBall}
                        onPress={() => {
                          if (!referenceBall) return;

                          dropBall({
                            playerId: player.id,
                            ballNumber: ball.ballNumber as BallNumber,
                            referencePlayerId: referenceBall.playerId,
                            referenceBallNumber: referenceBall.ballNumber,
                            note: `Dropped near ${referenceBall.playerName}'s ball ${referenceBall.ballNumber}.`,
                          });
                        }}
                      />
                    </View>

                    {ball.events.slice(-3).map((event) => (
                      <Text key={event.id} style={styles.eventText}>
                        {event.type === "stroke"
                          ? `Shot ${event.strokeNumber}: ${event.distanceYards} yd, ${event.remainingDistanceAfterYards} yd left`
                          : `${event.type}: +${event.penalties} penalty, ${event.remainingDistanceAfterYards} yd left`}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton(props: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const variant = props.variant ?? "primary";

  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        variant === "danger" && styles.dangerButton,
        props.disabled && styles.disabledButton,
        pressed && !props.disabled && styles.pressedButton,
      ]}
    >
      <Text style={styles.buttonText}>{props.label}</Text>
    </Pressable>
  );
}

export default function App() {
  const round = useRoundStore((state) => state.round);
  return round ? <RoundScreen /> : <SetupScreen />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f7f2",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#17351f",
  },
  subtitle: {
    fontSize: 15,
    color: "#526258",
  },
  panel: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dde5d8",
    gap: 10,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17351f",
  },
  bodyText: {
    fontSize: 14,
    color: "#344238",
  },
  error: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffe8e8",
    color: "#9d1c1c",
    fontWeight: "700",
  },
  navRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  playerSection: {
    marginHorizontal: 16,
    marginBottom: 18,
    gap: 10,
  },
  playerName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#17351f",
  },
  metaText: {
    color: "#526258",
    fontSize: 13,
  },
  ballCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dde5d8",
    gap: 8,
  },
  ballHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ballTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#17351f",
  },
  badge: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#e8efe5",
    color: "#17351f",
    fontSize: 12,
    fontWeight: "800",
  },
  recommendation: {
    fontSize: 14,
    fontWeight: "700",
    color: "#245c36",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  button: {
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#245c36",
  },
  secondaryButton: {
    backgroundColor: "#4f6f5a",
  },
  dangerButton: {
    backgroundColor: "#9d3a2f",
  },
  disabledButton: {
    backgroundColor: "#aab5aa",
  },
  pressedButton: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  eventText: {
    color: "#657166",
    fontSize: 12,
  },
});
