// src/game/validation.ts

import type {
  BallState,
  Club,
  PlayerHoleState,
  RoundState,
  ShotOutcomeType,
  ValidationResult,
} from "./types";

function result(errors: string[] = [], warnings: string[] = []): ValidationResult {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function isStrict(round: RoundState) {
  return round.settings.strictMode || round.settings.gameMode === "serious";
}

export function areAllPlayerBallsUnavailable(playerHole: PlayerHoleState): boolean {
  return playerHole.balls.every((ball) =>
    ["unplayable", "out-of-play", "lost"].includes(ball.playableState),
  );
}

export function validateResolvedShot(input: {
  round: RoundState;
  ball: BallState;
  club?: Club;
  outcomeType: ShotOutcomeType;
  shotDistanceYards: number;
  distanceFromTeeAfterYards: number;
  remainingDistanceAfterYards: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const strict = isStrict(input.round);
  const isDrop = input.outcomeType === "drop-average" || input.outcomeType === "random-drop";

  if (!input.round.settings.shotTrackingEnabled) {
    errors.push("This game mode does not use shot tracking.");
  }

  if (input.ball.playableState !== "playable" && !isDrop) {
    errors.push(`Ball ${input.ball.ballNumber} is not playable.`);
  }

  if (input.shotDistanceYards < 0) {
    errors.push("Shot distance cannot be negative.");
  }

  if (strict && !input.club && !isDrop) {
    errors.push("Serious Game requires a valid club for each shot.");
  }

  if (input.club && input.shotDistanceYards > input.club.maxDistanceYards + 5) {
    const message = `${input.club.name} cannot realistically travel ${input.shotDistanceYards} yards. Max is ${input.club.maxDistanceYards}.`;

    if (strict) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  if (input.remainingDistanceAfterYards < 0) {
    errors.push("Remaining distance cannot be negative.");
  }

  if (input.distanceFromTeeAfterYards < 0) {
    errors.push("Distance from tee cannot be negative.");
  }

  return result(errors, warnings);
}

export function validateDropAttempt(input: {
  round: RoundState;
  playerHole: PlayerHoleState;
  targetBall: BallState;
  outcomeType: ShotOutcomeType;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const strict = isStrict(input.round);
  const allUnavailable = areAllPlayerBallsUnavailable(input.playerHole);

  if (input.targetBall.playableState === "holed") {
    errors.push("A holed ball cannot be dropped.");
  }

  if (input.outcomeType === "random-drop" && !input.round.settings.allowRandomDrop) {
    errors.push("Random drops are not available in this game mode.");
  }

  if (strict && !allUnavailable) {
    errors.push("Serious Game does not allow a drop while the player still has a playable ball.");
  }

  if (!strict && !allUnavailable && input.targetBall.playableState === "playable") {
    warnings.push("Dropping a playable ball is allowed here, but it is not normal golf logic.");
  }

  const playerRound = input.round.playerRoundStates[input.playerHole.playerId];

  if (playerRound.dropsRemaining !== null && playerRound.dropsRemaining <= 0) {
    errors.push("No drops remaining.");
  }

  return result(errors, warnings);
}

export function validateBasicScore(input: {
  round: RoundState;
  playerId: string;
  holeNumber: number;
  nextScore: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!input.round.settings.basicScoringOnly) {
    errors.push("Basic scoring is only available in Basic Golf Game mode.");
  }

  if (input.nextScore < 1) {
    errors.push("Score cannot be lower than 1.");
  }

  return result(errors);
}

export function validateFinishHole(round: RoundState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const strict = isStrict(round);
  const currentHoleStates = round.holeStates[round.currentHoleNumber];

  if (round.settings.basicScoringOnly) {
    for (const player of round.players) {
      const score = round.basicScores[player.id]?.scoresByHole[round.currentHoleNumber]?.score;

      if (!score || score < 1) {
        errors.push(`${player.name} needs a valid score before finishing the hole.`);
      }
    }

    return result(errors, warnings);
  }

  for (const player of round.players) {
    const playerHole = currentHoleStates[player.id];

    if (!playerHole) {
      errors.push(`Missing hole state for ${player.name}.`);
      continue;
    }

    const hasAnyShot = playerHole.balls.some((ball) => ball.events.length > 0);
    const hasHoledBall = playerHole.balls.some((ball) => ball.playableState === "holed");

    if (strict && !hasHoledBall) {
      errors.push(`${player.name} must hole at least one ball before finishing in Serious Game.`);
    }

    if (!strict && !hasAnyShot) {
      warnings.push(`${player.name} has no shots recorded on this hole.`);
    }
  }

  return result(errors, warnings);
}
