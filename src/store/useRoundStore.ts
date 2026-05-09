// src/store/useRoundStore.ts

import { create } from "zustand";

import {
  createRound,
  dropBall as engineDropBall,
  goToNextHole,
  goToPreviousHole,
  markBallUnplayable as engineMarkBallUnplayable,
  recordShot as engineRecordShot,
} from "../game/engine";

import type {
  Course,
  DropBallInput,
  MarkBallUnplayableInput,
  Player,
  RecordShotInput,
  RoundSettings,
  RoundState,
} from "../game/types";

type RoundStore = {
  round: RoundState | null;
  error: string | null;

  startRound: (
    course: Course,
    players: Player[],
    teeBox: string,
    settings?: Partial<RoundSettings>,
  ) => void;

  recordShot: (input: RecordShotInput) => void;
  markBallUnplayable: (input: MarkBallUnplayableInput) => void;
  dropBall: (input: DropBallInput) => void;

  nextHole: () => void;
  previousHole: () => void;

  resetRound: () => void;
  clearError: () => void;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export const useRoundStore = create<RoundStore>((set, get) => ({
  round: null,
  error: null,

  startRound: (course, players, teeBox, settings) => {
    try {
      set({
        round: createRound({ course, players, teeBox, settings }),
        error: null,
      });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  recordShot: (input) => {
    const round = get().round;
    if (!round) return set({ error: "Start a round first." });

    try {
      set({ round: engineRecordShot(round, input), error: null });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  markBallUnplayable: (input) => {
    const round = get().round;
    if (!round) return set({ error: "Start a round first." });

    try {
      set({ round: engineMarkBallUnplayable(round, input), error: null });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  dropBall: (input) => {
    const round = get().round;
    if (!round) return set({ error: "Start a round first." });

    try {
      set({ round: engineDropBall(round, input), error: null });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  nextHole: () => {
    const round = get().round;
    if (round) set({ round: goToNextHole(round), error: null });
  },

  previousHole: () => {
    const round = get().round;
    if (round) set({ round: goToPreviousHole(round), error: null });
  },

  resetRound: () => set({ round: null, error: null }),
  clearError: () => set({ error: null }),
}));
