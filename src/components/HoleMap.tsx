// src/components/HoleMap.tsx
// Simplified fake 2D golf hole map.
// Shows tee box, green, fairway shape, hazards, and ball avatar markers.

import React from "react";
import {
  DimensionValue,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { BallAvatarMarker } from "./BallAvatarMarker";
import {
  getCurrentHole,
  getGameModeDefinition,
  getHoleDistance,
} from "../game/engine";
import type { HazardSide, HoleShape, RoundState } from "../game/types";

type HoleMapProps = {
  round: RoundState;
};

function clampPercent(value: number): number {
  return Math.max(6, Math.min(90, value));
}

function percent(value: number): DimensionValue {
  return `${value}%` as DimensionValue;
}

function getBallTopPercent(
  distanceFromTee: number,
  holeDistance: number,
): DimensionValue {
  const ratio = holeDistance <= 0 ? 0 : distanceFromTee / holeDistance;
  return percent(clampPercent(88 - ratio * 76));
}

function getBallLeftPercent(lateralOffsetYards: number): DimensionValue {
  return percent(clampPercent(50 + lateralOffsetYards * 0.42));
}

function getHazardLeft(side?: HazardSide): DimensionValue {
  if (side === "left") return "14%" as DimensionValue;
  if (side === "right") return "68%" as DimensionValue;
  if (side === "center") return "42%" as DimensionValue;
  if (side === "short") return "42%" as DimensionValue;
  if (side === "long") return "42%" as DimensionValue;
  return "42%" as DimensionValue;
}

function getFairwayPieces(shape: HoleShape): ViewStyle[] {
  if (shape === "dogleg-left") {
    return [styles.lowerFairway, styles.leftDogleg];
  }

  if (shape === "dogleg-right") {
    return [styles.lowerFairway, styles.rightDogleg];
  }

  if (shape === "split-fairway") {
    return [styles.splitLeft, styles.splitRight];
  }

  return [styles.straightFairway];
}

export function HoleMap({ round }: HoleMapProps) {
  const hole = getCurrentHole(round);
  const holeDistance = getHoleDistance(hole, round.teeBox);
  const mode = getGameModeDefinition(round.settings.gameMode);

  const fairwayPieces = getFairwayPieces(hole.shape);

  const markers = round.players.flatMap((player) => {
    const playerHole = round.holeStates[round.currentHoleNumber][player.id];

    return playerHole.balls.map((ball) => ({
      player,
      ball,
      top: getBallTopPercent(
        ball.mapPosition.distanceFromTeeYards,
        holeDistance,
      ),
      left: getBallLeftPercent(ball.mapPosition.lateralOffsetYards),
    }));
  });

  return (
    <View style={styles.shell}>
      <View style={styles.infoBar}>
        <Text style={styles.courseName}>{round.course.name}</Text>

        <Text style={styles.holeLine}>
          Hole {hole.holeNumber} of {round.course.holes.length} - Par {hole.par} - HCP{" "}
          {hole.handicap}
        </Text>

        <Text style={styles.detailLine}>
          {round.teeBox} tees - {holeDistance} yd - {mode.title} - {hole.shape}
        </Text>
      </View>

      <View style={styles.mapWindow}>
        {fairwayPieces.map((piece, index) => (
          <View key={`fairway-${index}`} style={[styles.fairway, piece]} />
        ))}

        <View style={styles.teeBox}>
          <Text style={styles.mapLabel}>TEE</Text>
        </View>

        <View style={styles.green}>
          <Text style={styles.greenText}>GREEN</Text>
        </View>

        {hole.hazards.map((hazard) => {
          const distance = hazard.distanceFromTeeYards ?? holeDistance * 0.5;
          const top = getBallTopPercent(distance, holeDistance);
          const left = getHazardLeft(hazard.side);

          return (
            <View
              key={hazard.id}
              style={[
                styles.hazard,
                {
                  top,
                  left,
                },
              ]}
            >
              <Text style={styles.hazardText}>{hazard.name}</Text>
            </View>
          );
        })}

        {markers.map(({ player, ball, top, left }) => (
          <BallAvatarMarker
            key={`${player.id}-${ball.ballNumber}`}
            avatar={ball.avatar}
            playerName={player.name}
            playableState={ball.playableState}
            size="sm"
            style={[
              styles.ballMarker,
              {
                top,
                left,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.tipBox}>
        {hole.strategyTips.map((tip) => (
          <Text key={tip} style={styles.tipText}>
            - {tip}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    margin: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe5d5",
  },
  infoBar: {
    padding: 14,
    gap: 4,
    backgroundColor: "#17351f",
  },
  courseName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  holeLine: {
    color: "#edf4e9",
    fontSize: 14,
    fontWeight: "800",
  },
  detailLine: {
    color: "#cbd9c4",
    fontSize: 12,
    fontWeight: "700",
  },
  mapWindow: {
    height: 340,
    position: "relative",
    backgroundColor: "#dfead8",
    overflow: "hidden",
  },
  fairway: {
    position: "absolute",
    backgroundColor: "#7eb36a",
    borderColor: "#5e9952",
    borderWidth: 2,
  },
  straightFairway: {
    left: "36%",
    top: "16%",
    width: "28%",
    height: "70%",
    borderRadius: 80,
  },
  lowerFairway: {
    left: "39%",
    top: "48%",
    width: "24%",
    height: "38%",
    borderRadius: 60,
  },
  leftDogleg: {
    left: "22%",
    top: "16%",
    width: "36%",
    height: "42%",
    borderRadius: 70,
  },
  rightDogleg: {
    left: "42%",
    top: "16%",
    width: "36%",
    height: "42%",
    borderRadius: 70,
  },
  splitLeft: {
    left: "22%",
    top: "18%",
    width: "22%",
    height: "62%",
    borderRadius: 60,
  },
  splitRight: {
    left: "56%",
    top: "18%",
    width: "22%",
    height: "62%",
    borderRadius: 60,
  },
  teeBox: {
    position: "absolute",
    bottom: 14,
    left: "41%",
    width: "18%",
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b08b59",
  },
  green: {
    position: "absolute",
    top: 20,
    left: "38%",
    width: "24%",
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f9d4d",
    borderWidth: 2,
    borderColor: "#347d36",
  },
  greenText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  mapLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  hazard: {
    position: "absolute",
    width: "20%",
    minHeight: 30,
    borderRadius: 8,
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5a8fb8",
  },
  hazardText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  ballMarker: {
    position: "absolute",
    transform: [{ translateX: -18 }, { translateY: -16 }],
  },
  tipBox: {
    padding: 12,
    gap: 4,
    backgroundColor: "#f8faf4",
  },
  tipText: {
    color: "#344238",
    fontSize: 13,
    lineHeight: 18,
  },
});