// src/store/useRoundStore.ts

import { create } from "zustand";

import {
  adjustBasicScore as engineAdjustBasicScore,
  applyShotOutcome as engineApplyShotOutcome,
  createRound,
  finishCurrentHole as engineFinishCurrentHole,
  goToNextHole,
  goToPreviousHole,
} from "../game/engine";

import type {
  ApplyShotOutcomeInput,
  BasicScoreAdjustmentInput,
  Course,
  GameModeId,
  Player,
  RoundSettings,
  RoundState,
} from "../game/types";

type RoundStore = {
  round: RoundState | null;
  error: string | null;
  scorecardOpen: boolean;

  startRound: (
    course: Course,
    players: Player[],
    teeBox: string,
    gameMode: GameModeId,
    settings?: Partial<RoundSettings>,
  ) => void;

  applyShotOutcome: (input: ApplyShotOutcomeInput) => void;
  adjustBasicScore: (input: BasicScoreAdjustmentInput) => void;
  finishCurrentHole: () => void;
  nextHole: () => void;
  previousHole: () => void;
  toggleScorecard: () => void;
  endRound: () => void;
  clearError: () => void;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export const useRoundStore = create<RoundStore>((set, get) => ({
  round: null,
  error: null,
  scorecardOpen: false,

  startRound: (course, players, teeBox, gameMode, settings) => {
    try {
      set({
        round: createRound({ course, players, teeBox, gameMode, settings }),
        error: null,
        scorecardOpen: false,
      });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  applyShotOutcome: (input) => {
    const round = get().round;
    if (!round) return set({ error: "Start a round first." });

    try {
      set({
        round: engineApplyShotOutcome(round, input),
        error: null,
      });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  adjustBasicScore: (input) => {
    const round = get().round;
    if (!round) return set({ error: "Start a round first." });

    try {
      set({
        round: engineAdjustBasicScore(round, input),
        error: null,
      });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  finishCurrentHole: () => {
    const round = get().round;
    if (!round) return set({ error: "Start a round first." });

    try {
      set({
        round: engineFinishCurrentHole(round),
        error: null,
      });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  nextHole: () => {
    const round = get().round;
    if (!round) return;

    set({
      round: goToNextHole(round),
      error: null,
    });
  },

  previousHole: () => {
    const round = get().round;
    if (!round) return;

    set({
      round: goToPreviousHole(round),
      error: null,
    });
  },

  toggleScorecard: () => {
    set({ scorecardOpen: !get().scorecardOpen });
  },

  endRound: () => {
    set({
      round: null,
      error: null,
      scorecardOpen: false,
    });
  },

  clearError: () => set({ error: null }),
}));
