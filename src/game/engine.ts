// src/game/engine.ts

import type {
  BallEvent,
  BallNumber,
  BallState,
  ClubRecommendation,
  Course,
  CourseHole,
  DropBallInput,
  LieStatus,
  MarkBallUnplayableInput,
  Player,
  PlayerHoleState,
  PlayerRoundState,
  PlayableState,
  RecordShotInput,
  RoundSettings,
  RoundState,
} from "./types";

// ---------------------------------------------------------
// SMALL UTILITIES
// ---------------------------------------------------------

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampBallsPerPlayer(value: number): 1 | 2 | 3 {
  if (value <= 1) return 1;
  if (value >= 3) return 3;
  return 2;
}

export function createRoundSettings(
  overrides: Partial<RoundSettings> = {},
): RoundSettings {
  const merged: RoundSettings = {
    gameMode: "three-ball",
    ballsPerPlayer: 3,
    dropPenaltyStrokes: 1,
    singleBallStartingDrops: 5,
    allowDropNearOtherPlayersBall: true,
    ...overrides,
  };

  return {
    ...merged,
    ballsPerPlayer: clampBallsPerPlayer(merged.ballsPerPlayer),
  };
}

// ---------------------------------------------------------
// COURSE HELPERS
// ---------------------------------------------------------

export function getCurrentHole(round: RoundState): CourseHole {
  const hole = round.course.holes.find(
    (item) => item.holeNumber === round.currentHoleNumber,
  );

  if (!hole) {
    throw new Error(`Hole ${round.currentHoleNumber} does not exist.`);
  }

  return hole;
}

export function getHoleDistance(hole: CourseHole, teeBox: string): number {
  const distance = hole.teeDistances[teeBox];

  if (typeof distance !== "number") {
    throw new Error(
      `Missing ${teeBox} tee distance for hole ${hole.holeNumber}.`,
    );
  }

  return distance;
}

// ---------------------------------------------------------
// ROUND CREATION
// ---------------------------------------------------------

function createBallState(
  ballNumber: BallNumber,
  holeDistanceYards: number,
): BallState {
  return {
    ballNumber,
    startingDistanceYards: holeDistanceYards,
    remainingDistanceYards: holeDistanceYards,
    lie: "tee",
    playableState: "playable",
    events: [],
    strokes: 0,
    penalties: 0,
  };
}

function createPlayerHoleState(
  playerId: string,
  holeNumber: number,
  holeDistanceYards: number,
  ballsPerPlayer: 1 | 2 | 3,
): PlayerHoleState {
  const balls = Array.from({ length: ballsPerPlayer }, (_, index) =>
    createBallState((index + 1) as BallNumber, holeDistanceYards),
  );

  return {
    playerId,
    holeNumber,
    balls,
    selectedBallNumber: 1,
    holeComplete: false,
  };
}

function createPlayerRoundState(
  playerId: string,
  settings: RoundSettings,
): PlayerRoundState {
  return {
    playerId,
    dropsRemaining:
      settings.ballsPerPlayer === 1 ? settings.singleBallStartingDrops : null,
    totalStrokesHit: 0,
    totalPenalties: 0,
  };
}

export function createRound(input: {
  course: Course;
  players: Player[];
  teeBox: string;
  settings?: Partial<RoundSettings>;
}): RoundState {
  if (input.course.holes.length === 0) {
    throw new Error("Cannot start a round without holes.");
  }

  if (input.players.length === 0) {
    throw new Error("Cannot start a round without players.");
  }

  const settings = createRoundSettings(input.settings);
  const firstHoleNumber = [...input.course.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  )[0].holeNumber;

  const holeStates: RoundState["holeStates"] = {};

  for (const hole of input.course.holes) {
    const holeDistance = getHoleDistance(hole, input.teeBox);
    holeStates[hole.holeNumber] = {};

    for (const player of input.players) {
      holeStates[hole.holeNumber][player.id] = createPlayerHoleState(
        player.id,
        hole.holeNumber,
        holeDistance,
        settings.ballsPerPlayer,
      );
    }
  }

  const playerRoundStates: RoundState["playerRoundStates"] = {};

  for (const player of input.players) {
    playerRoundStates[player.id] = createPlayerRoundState(player.id, settings);
  }

  const timestamp = nowIso();

  return {
    id: makeId("round"),
    course: input.course,
    teeBox: input.teeBox,
    players: input.players,
    settings,
    currentHoleNumber: firstHoleNumber,
    playerRoundStates,
    holeStates,
    startedAt: timestamp,
    updatedAt: timestamp,
  };
}

// ---------------------------------------------------------
// STATE LOOKUPS + IMMUTABLE REPLACEMENT HELPERS
// ---------------------------------------------------------

function getPlayerHoleState(
  round: RoundState,
  playerId: string,
): PlayerHoleState {
  const playerHole = round.holeStates[round.currentHoleNumber]?.[playerId];

  if (!playerHole) {
    throw new Error(`Missing hole state for player ${playerId}.`);
  }

  return playerHole;
}

function getBallState(
  playerHole: PlayerHoleState,
  ballNumber: BallNumber,
): BallState {
  const ball = playerHole.balls.find((item) => item.ballNumber === ballNumber);

  if (!ball) {
    throw new Error(`Ball ${ballNumber} does not exist for this player.`);
  }

  return ball;
}

function replaceBall(
  playerHole: PlayerHoleState,
  updatedBall: BallState,
): PlayerHoleState {
  return {
    ...playerHole,
    selectedBallNumber: updatedBall.ballNumber,
    balls: playerHole.balls.map((ball) =>
      ball.ballNumber === updatedBall.ballNumber ? updatedBall : ball,
    ),
  };
}

function replacePlayerHoleState(
  round: RoundState,
  playerHole: PlayerHoleState,
  playerRoundState?: PlayerRoundState,
): RoundState {
  return {
    ...round,
    updatedAt: nowIso(),
    playerRoundStates: playerRoundState
      ? {
          ...round.playerRoundStates,
          [playerRoundState.playerId]: playerRoundState,
        }
      : round.playerRoundStates,
    holeStates: {
      ...round.holeStates,
      [playerHole.holeNumber]: {
        ...round.holeStates[playerHole.holeNumber],
        [playerHole.playerId]: playerHole,
      },
    },
  };
}

// ---------------------------------------------------------
// SHOT TRACKING
// This is where remaining distance auto-calculates.
// ---------------------------------------------------------

export function recordShot(
  round: RoundState,
  input: RecordShotInput,
): RoundState {
  const playerHole = getPlayerHoleState(round, input.playerId);
  const ball = getBallState(playerHole, input.ballNumber);

  if (ball.playableState !== "playable") {
    throw new Error(`Ball ${input.ballNumber} is not playable.`);
  }

  const distance = Math.max(0, Math.round(input.distanceYards));
  const remainingAfter = Math.max(0, ball.remainingDistanceYards - distance);

  const playableStateAfter: PlayableState =
    input.playableStateAfter ??
    (remainingAfter === 0 || input.lieAfter === "holed"
      ? "holed"
      : "playable");

  const lieAfter: LieStatus =
    playableStateAfter === "holed" ? "holed" : input.lieAfter;

  const penalties = input.penalties ?? 0;

  const event: BallEvent = {
    id: makeId("event"),
    type: "stroke",
    eventNumber: ball.events.length + 1,
    strokeNumber: ball.strokes + 1,
    clubId: input.clubId,
    distanceYards: distance,
    remainingDistanceBeforeYards: ball.remainingDistanceYards,
    remainingDistanceAfterYards: remainingAfter,
    lieAfter,
    playableStateAfter,
    penalties,
    note: input.note,
    createdAt: nowIso(),
  };

  const updatedBall: BallState = {
    ...ball,
    remainingDistanceYards: remainingAfter,
    lie: lieAfter,
    playableState: playableStateAfter,
    events: [...ball.events, event],
    strokes: ball.strokes + 1,
    penalties: ball.penalties + penalties,
  };

  const updatedPlayerHole = replaceBall(playerHole, updatedBall);

  const playerRound = round.playerRoundStates[input.playerId];

  const updatedPlayerRound: PlayerRoundState = {
    ...playerRound,
    totalStrokesHit: playerRound.totalStrokesHit + 1,
    totalPenalties: playerRound.totalPenalties + penalties,
  };

  return replacePlayerHoleState(round, updatedPlayerHole, updatedPlayerRound);
}

// ---------------------------------------------------------
// UNPLAYABLE + DROP RULES
// ---------------------------------------------------------

export function markBallUnplayable(
  round: RoundState,
  input: MarkBallUnplayableInput,
): RoundState {
  const playerHole = getPlayerHoleState(round, input.playerId);
  const ball = getBallState(playerHole, input.ballNumber);

  if (ball.playableState === "holed") {
    throw new Error("A holed ball cannot be marked unplayable.");
  }

  const event: BallEvent = {
    id: makeId("event"),
    type: "penalty",
    eventNumber: ball.events.length + 1,
    distanceYards: 0,
    remainingDistanceBeforeYards: ball.remainingDistanceYards,
    remainingDistanceAfterYards: ball.remainingDistanceYards,
    lieAfter: ball.lie,
    playableStateAfter: "unplayable",
    penalties: 0,
    note: input.note ?? "Marked unplayable.",
    createdAt: nowIso(),
  };

  const updatedBall: BallState = {
    ...ball,
    playableState: "unplayable",
    events: [...ball.events, event],
  };

  return replacePlayerHoleState(round, replaceBall(playerHole, updatedBall));
}

export function areAllPlayerBallsUnplayable(
  playerHole: PlayerHoleState,
): boolean {
  return playerHole.balls.every(
    (ball) =>
      ball.playableState === "unplayable" || ball.playableState === "lost",
  );
}

export function dropBall(round: RoundState, input: DropBallInput): RoundState {
  const playerHole = getPlayerHoleState(round, input.playerId);

  if (!areAllPlayerBallsUnplayable(playerHole)) {
    throw new Error("Drop is only available when all player balls are dead.");
  }

  if (
    input.referencePlayerId !== input.playerId &&
    !round.settings.allowDropNearOtherPlayersBall
  ) {
    throw new Error("Dropping near another player's ball is disabled.");
  }

  const referencePlayerHole = getPlayerHoleState(round, input.referencePlayerId);
  const referenceBall = getBallState(
    referencePlayerHole,
    input.referenceBallNumber,
  );

  if (referenceBall.playableState !== "playable") {
    throw new Error("Reference ball must be playable.");
  }

  const playerRound = round.playerRoundStates[input.playerId];

  if (playerRound.dropsRemaining !== null && playerRound.dropsRemaining <= 0) {
    throw new Error("No drops remaining.");
  }

  const targetBall = getBallState(playerHole, input.ballNumber);
  const penalty = round.settings.dropPenaltyStrokes;
  const lieAfter = input.lieAfter ?? referenceBall.lie;

  const event: BallEvent = {
    id: makeId("event"),
    type: "drop",
    eventNumber: targetBall.events.length + 1,
    distanceYards: 0,
    remainingDistanceBeforeYards: targetBall.remainingDistanceYards,
    remainingDistanceAfterYards: referenceBall.remainingDistanceYards,
    lieAfter,
    playableStateAfter: "playable",
    penalties: penalty,
    note: input.note ?? "Dropped near playable reference ball.",
    createdAt: nowIso(),
  };

  const updatedBall: BallState = {
    ...targetBall,
    remainingDistanceYards: referenceBall.remainingDistanceYards,
    lie: lieAfter,
    playableState: "playable",
    penalties: targetBall.penalties + penalty,
    events: [...targetBall.events, event],
  };

  const updatedPlayerRound: PlayerRoundState = {
    ...playerRound,
    dropsRemaining:
      playerRound.dropsRemaining === null
        ? null
        : playerRound.dropsRemaining - 1,
    totalPenalties: playerRound.totalPenalties + penalty,
  };

  return replacePlayerHoleState(
    round,
    replaceBall(playerHole, updatedBall),
    updatedPlayerRound,
  );
}

// ---------------------------------------------------------
// CLUB RECOMMENDATIONS
// Simple now, smarter later.
// ---------------------------------------------------------

export function recommendClubs(
  player: Player,
  remainingDistanceYards: number,
  lie: LieStatus,
  limit = 3,
): ClubRecommendation[] {
  if (player.clubProfile.length === 0) return [];

  const targetDistance =
    lie === "rough" || lie === "sand" || lie === "hazard"
      ? remainingDistanceYards * 0.9
      : remainingDistanceYards;

  return [...player.clubProfile]
    .map((club) => {
      const gap = Math.abs(club.averageDistanceYards - targetDistance);

      return {
        club,
        distanceGapYards: Math.round(gap),
        reason:
          lie === "green"
            ? "Putting situation."
            : `Closest match to ${Math.round(targetDistance)} yards.`,
      };
    })
    .sort((a, b) => a.distanceGapYards - b.distanceGapYards)
    .slice(0, limit);
}

// ---------------------------------------------------------
// ROUND NAVIGATION
// ---------------------------------------------------------

function sortedHoleNumbers(round: RoundState): number[] {
  return round.course.holes
    .map((hole) => hole.holeNumber)
    .sort((a, b) => a - b);
}

export function goToNextHole(round: RoundState): RoundState {
  const holes = sortedHoleNumbers(round);
  const index = holes.indexOf(round.currentHoleNumber);
  const nextHoleNumber = holes[Math.min(index + 1, holes.length - 1)];

  return {
    ...round,
    currentHoleNumber: nextHoleNumber,
    updatedAt: nowIso(),
  };
}

export function goToPreviousHole(round: RoundState): RoundState {
  const holes = sortedHoleNumbers(round);
  const index = holes.indexOf(round.currentHoleNumber);
  const previousHoleNumber = holes[Math.max(index - 1, 0)];

  return {
    ...round,
    currentHoleNumber: previousHoleNumber,
    updatedAt: nowIso(),
  };
}

// ---------------------------------------------------------
// COURSE BUILDER FOUNDATION
// ---------------------------------------------------------

export function createEmptyCourse(name: string): Course {
  const timestamp = nowIso();

  return {
    id: makeId("course"),
    name,
    source: "manual",
    holes: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createEmptyHole(holeNumber: number): CourseHole {
  return {
    holeNumber,
    par: 4,
    handicap: holeNumber,
    teeDistances: {},
    shape: "straight",
    hazards: [],
    strategyTips: [],
    photoUris: [],
  };
}

export function upsertHole(course: Course, hole: CourseHole): Course {
  const existing = course.holes.filter(
    (item) => item.holeNumber !== hole.holeNumber,
  );

  return {
    ...course,
    holes: [...existing, hole].sort((a, b) => a.holeNumber - b.holeNumber),
    updatedAt: nowIso(),
  };
}

export function validateCourse(course: Course): string[] {
  const issues: string[] = [];

  if (!course.name.trim()) {
    issues.push("Course name is required.");
  }

  if (course.holes.length === 0) {
    issues.push("At least one hole is required.");
  }

  for (const hole of course.holes) {
    if (hole.par <= 0) issues.push(`Hole ${hole.holeNumber}: par is invalid.`);
    if (hole.handicap <= 0) {
      issues.push(`Hole ${hole.holeNumber}: handicap is invalid.`);
    }
    if (Object.keys(hole.teeDistances).length === 0) {
      issues.push(`Hole ${hole.holeNumber}: add at least one tee distance.`);
    }
  }

  return issues;
}
