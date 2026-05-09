// src/components/GameModeCard.tsx

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ActionButton } from "./ActionButton";
import type { GameModeDefinition } from "../game/types";

type GameModeCardProps = {
  mode: GameModeDefinition;
  onStart: () => void;
};

export function GameModeCard({ mode, onStart }: GameModeCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.textArea}>
        <Text style={styles.title}>{mode.title}</Text>
        <Text style={styles.description}>{mode.description}</Text>

        <View style={styles.ruleList}>
          {mode.rules.map((rule) => (
            <Text key={rule} style={styles.rule}>
              - {rule}
            </Text>
          ))}
        </View>
      </View>

      <ActionButton label={`Start ${mode.shortName}`} onPress={onStart} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe5d5",
  },
  textArea: {
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#17351f",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: "#526258",
  },
  ruleList: {
    gap: 4,
  },
  rule: {
    fontSize: 13,
    lineHeight: 18,
    color: "#344238",
  },
});
