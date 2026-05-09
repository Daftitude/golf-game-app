// src/components/ActionButton.tsx

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "light";
  disabled?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
};

export function ActionButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  compact = false,
  fullWidth = false,
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        fullWidth && styles.fullWidth,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        variant === "light" && styles.light,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.text, variant === "light" && styles.lightText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#245c36",
  },
  compact: {
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  secondary: {
    backgroundColor: "#55765d",
  },
  danger: {
    backgroundColor: "#9d3a2f",
  },
  light: {
    backgroundColor: "#e9efe4",
  },
  disabled: {
    backgroundColor: "#aeb8ad",
  },
  pressed: {
    opacity: 0.82,
  },
  text: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  lightText: {
    color: "#17351f",
  },
});
