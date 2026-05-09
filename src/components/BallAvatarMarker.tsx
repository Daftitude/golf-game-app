// src/components/BallAvatarMarker.tsx

import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import type { BallAvatar, PlayableState } from "../game/types";

type BallAvatarMarkerProps = {
  avatar: BallAvatar;
  playerName?: string;
  playableState?: PlayableState;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
};

function getInitials(name?: string) {
  if (!name) return "";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function BallAvatarMarker({
  avatar,
  playerName,
  playableState,
  size = "md",
  style,
}: BallAvatarMarkerProps) {
  const isSmall = size === "sm";
  const isDead = playableState === "out-of-play" || playableState === "lost" || playableState === "unplayable";

  return (
    <View style={[styles.wrap, style]}>
      <View
        style={[
          styles.marker,
          isSmall && styles.smallMarker,
          { backgroundColor: avatar.color },
          avatar.color === "#ffffff" && styles.whiteMarker,
          isDead && styles.deadMarker,
        ]}
      >
        <Text style={[styles.number, isSmall && styles.smallNumber]}>{avatar.numberLabel}</Text>
      </View>

      {playerName ? (
        <Text style={[styles.label, isSmall && styles.smallLabel]}>
          {getInitials(playerName)} {avatar.name}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 3,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#17351f",
  },
  smallMarker: {
    width: 22,
    height: 22,
  },
  whiteMarker: {
    borderColor: "#7e8a7d",
  },
  deadMarker: {
    opacity: 0.5,
  },
  number: {
    color: "#17351f",
    fontSize: 13,
    fontWeight: "900",
  },
  smallNumber: {
    fontSize: 11,
  },
  label: {
    maxWidth: 82,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.9)",
    color: "#17351f",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  smallLabel: {
    fontSize: 9,
  },
});
