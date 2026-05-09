// src/screens/SetupScreen.tsx

import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { GameModeCard } from "../components/GameModeCard";
import { GAME_MODE_DEFINITIONS } from "../game/engine";
import { sampleCourse, samplePlayers } from "../data/sampleData";
import { useRoundStore } from "../store/useRoundStore";

export function SetupScreen() {
  const startRound = useRoundStore((state) => state.startRound);
  const error = useRoundStore((state) => state.error);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Golf Strategy Engine</Text>
          <Text style={styles.title}>Choose Your Game</Text>
          <Text style={styles.subtitle}>
            Start with local sample data. The app is structured so Supabase, OCR, GPS,
            and community courses can plug in later.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.grid}>
          {GAME_MODE_DEFINITIONS.map((mode) => (
            <GameModeCard
              key={mode.id}
              mode={mode}
              onStart={() => startRound(sampleCourse, samplePlayers, "white", mode.id)}
            />
          ))}
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
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    gap: 8,
    paddingVertical: 8,
  },
  kicker: {
    color: "#55765d",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: "#17351f",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "#526258",
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    gap: 14,
  },
  error: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffe8e8",
    color: "#9d1c1c",
    fontWeight: "800",
  },
});
