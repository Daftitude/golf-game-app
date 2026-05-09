// src/game/engine.ts

import {
  areAllPlayerBallsUnavailable,
  validateBasicScore,
  validateDropAttempt,
  validateFinishHole,
  validateResolvedShot,
} from "./validation";

import type {
  ApplyShotOutcomeInput,
  BallAvatar,
  BallEvent,
  BallMapPosition,
  BallNumber,
  BallState,
  BasicPlayerScoreState,
  BasicScoreAdjustmentInput,
  Club,
  ClubRecommendation,
  Course,
  CourseHole,
  GameModeDefinition,
  GameModeId,
  LieStatus,
  Player,
  PlayerHoleState,
  PlayerRoundState,
  PlayableState,
  RoundNotice,
  RoundSettings,
  RoundState,
  ScoreLabel,
  ShotDirection,
  ShotOutcomeType,
  ShotQuality,
} from "./types";

// =========================================================
// GAME MODE DEFINITIONS
// =========================================================

export const GAME_MODE_DEFINITIONS: GameModeDefinition[] = [
  {
    id: "basic",
    title: "Basic Golf Game",
    shortName: "Basic",
    description: "Simple scorecard mode with no shot or ball tracking.",
    rules: [
      "Normal scoring only.",
      "Each player gets one score per hole.",
      "Default score starts at par.",
    ],
  },
  {
    id: "three-ball-drop",
    title: "3 Ball Drop",
    shortName: "3 Ball",
    description: "Custom mode where each player manages three balls per hole.",
    rules: [
      "Track three separate balls.",
      "Use good shots, bad contact, out-of-play, and drops.",
      "Random drops are allowed.",
    ],
  },
  {
    id: "one-ball-drop",
    title: "1 Ball Drop",
    shortName: "1 Ball",
    description: "One ball per player with five drops for the round.",
    rules: [
      "One active ball per player.",
      "Each player starts with five drops.",
      "Drop usage is tracked.",
    ],
  },
  {
    id: "serious",
    title: "Serious Game",
    shortName: "Serious",
    description: "Strict shot tracking with realistic validation.",
    rules: [
      "Club distances are enforced.",
      "Invalid drops are blocked.",
      "Random drops are disabled.",
    ],
  },
];

export const DEFAULT_BALL_AVATARS: Record<BallNumber, BallAvatar> = {
  1: {
    color: "#ffffff",
    numberLabel: "1",
    name: "Safe Ball",
    emoji: "⚪",
    markerStyle: "circle",
  },
  2: {
    color: "#d64040",
    numberLabel: "2",
    name: "Risk Ball",
    emoji: "🔴",
    markerStyle: "circle",
  },
  3: {
    color: "#3169d8",
    numberLabel: "3",
    name: "Bomb Ball",
    emoji: "🔵",
    markerStyle: "circle",
  },
};

// =========================================================
// SMALL HELPERS
// =========================================================

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function rounded(value: number) {
  return Math.round(value);
}

function throwIfErrors(errors: string[]) {
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

function addNotices(round: RoundState, warnings: string[]): RoundState {
  if (warnings.length === 0) return round;

  const newNotices: RoundNotice[] = warnings.map((message) => ({
    id: makeId("notice"),
    type: "warning",
    message,
    createdAt: nowIso(),
  }));

  return {
    ...round,
    notices: [...round.notices, ...newNotices].slice(-8),
  };
}

// =========================================================
// MODE SETTINGS
// =========================================================

export function getGameModeDefinition(gameMode: GameModeId) {
  return GAME_MODE_DEFINITIONS.find((mode) => mode.id === gameMode) ?? GAME_MODE_DEFINITIONS[0];
}

export function createRoundSettings(
  gameMode: GameModeId,
  overrides: Partial<RoundSettings> = {},
): RoundSettings {
  const modeSettings: Record<GameModeId, RoundSettings> = {
    basic: {
      gameMode: "basic",
      ballsPerPlayer: 1,
      dropPenaltyStrokes: 0,
      singleBallStartingDrops: 0,
      allowDropNearOtherPlayersBall: false,
      allowRandomDrop: false,
      strictMode: false,
      shotTrackingEnabled: false,
      basicScoringOnly: true,
    },
    "three-ball-drop": {
      gameMode: "three-ball-drop",
      ballsPerPlayer: 3,
      dropPenaltyStrokes: 1,
      singleBallStartingDrops: 0,
      allowDropNearOtherPlayersBall: true,
      allowRandomDrop: true,
      strictMode: false,
      shotTrackingEnabled: true,
      basicScoringOnly: false,
    },
    "one-ball-drop": {
      gameMode: "one-ball-drop",
      ballsPerPlayer: 1,
      dropPenaltyStrokes: 1,
      singleBallStartingDrops: 5,
      allowDropNearOtherPlayersBall: true,
      allowRandomDrop: true,
      strictMode: false,
      shotTrackingEnabled: true,
      basicScoringOnly: false,
    },
    serious: {
      gameMode: "serious",
      ballsPerPlayer: 1,
      dropPenaltyStrokes: 1,
      singleBallStartingDrops: 0,
      allowDropNearOtherPlayersBall: false,
      allowRandomDrop: false,
      strictMode: true,
      shotTrackingEnabled: true,
      basicScoringOnly: false,
    },
  };

  return {
    ...modeSettings[gameMode],
    ...overrides,
  };
}

// =========================================================
// COURSE HELPERS
// =========================================================

export function getCurrentHole(round: RoundState): CourseHole {
  const hole = round.course.holes.find((item) => item.holeNumber === round.currentHoleNumber);

  if (!hole) {
    throw new Error(`Hole ${round.currentHoleNumber} does not exist.`);
  }

  return hole;
}

export function getHoleDistance(hole: CourseHole, teeBox: string): number {
  const distance = hole.teeDistances[teeBox];

  if (typeof distance !== "number") {
    throw new Error(`Missing ${teeBox} tee distance for hole ${hole.holeNumber}.`);
  }

  return distance;
}

function getHoleByNumber(round: RoundState, holeNumber: number) {
  const hole = round.course.holes.find((item) => item.holeNumber === holeNumber);

  if (!hole) {
    throw new Error(`Hole ${holeNumber} does not exist.`);
  }

  return hole;
}

function sortedHoleNumbers(round: RoundState): number[] {
  return round.course.holes.map((hole) => hole.holeNumber).sort((a, b) => a - b);
}

// =========================================================
// ROUND CREATION
// =========================================================

function createBallState(ballNumber: BallNumber, holeDistanceYards: number): BallState {
  return {
    ballNumber,
    avatar: DEFAULT_BALL_AVATARS[ballNumber],
    startingDistanceYards: holeDistanceYards,
    mapPosition: {
      distanceFromTeeYards: 0,
      lateralOffsetYards: 0,
    },
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

function createPlayerRoundState(playerId: string, settings: RoundSettings): PlayerRoundState {
  return {
    playerId,
    dropsRemaining:
      settings.gameMode === "one-ball-drop" ? settings.singleBallStartingDrops : null,
    totalStrokesHit: 0,
    totalPenalties: 0,
  };
}

function createBasicScores(players: Player[], course: Course): Record<string, BasicPlayerScoreState> {
  const scores: Record<string, BasicPlayerScoreState> = {};

  for (const player of players) {
    const scoresByHole: BasicPlayerScoreState["scoresByHole"] = {};

    for (const hole of course.holes) {
      scoresByHole[hole.holeNumber] = {
        holeNumber: hole.holeNumber,
        score: hole.par,
        completed: false,
      };
    }

    scores[player.id] = {
      playerId: player.id,
      scoresByHole,
    };
  }

  return scores;
}

export function createRound(input: {
  course: Course;
  players: Player[];
  teeBox: string;
  gameMode: GameModeId;
  settings?: Partial<RoundSettings>;
}): RoundState {
  if (input.course.holes.length === 0) {
    throw new Error("Cannot start a round without holes.");
  }

  if (input.players.length === 0) {
    throw new Error("Cannot start a round without players.");
  }

  const settings = createRoundSettings(input.gameMode, input.settings);
  const firstHoleNumber = sortedHoleNumbers({
    course: input.course,
  } as RoundState)[0];

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
    basicScores: createBasicScores(input.players, input.course),
    playerRoundStates,
    holeStates,
    notices: [],
    startedAt: timestamp,
    updatedAt: timestamp,
  };
}

// =========================================================
// LOOKUPS + IMMUTABLE REPLACEMENT
// =========================================================

export function getPlayerHoleState(round: RoundState, playerId: string): PlayerHoleState {
  const playerHole = round.holeStates[round.currentHoleNumber]?.[playerId];

  if (!playerHole) {
    throw new Error(`Missing hole state for player ${playerId}.`);
  }

  return playerHole;
}

export function getBallState(playerHole: PlayerHoleState, ballNumber: BallNumber): BallState {
  const ball = playerHole.balls.find((item) => item.ballNumber === ballNumber);

  if (!ball) {
    throw new Error(`Ball ${ballNumber} does not exist for this player.`);
  }

  return ball;
}

function replaceBall(playerHole: PlayerHoleState, updatedBall: BallState): PlayerHoleState {
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

// =========================================================
// CLUB RECOMMENDATIONS
// =========================================================

export function recommendClubs(
  player: Player,
  remainingDistanceYards: number,
  lie: LieStatus,
  gameMode: GameModeId,
  limit = 3,
): ClubRecommendation[] {
  if (player.clubProfile.length === 0) return [];

  const lieAdjustment =
    lie === "rough" || lie === "sand" || lie === "hazard" ? 0.9 : 1;

  const targetDistance = remainingDistanceYards * lieAdjustment;

  return [...player.clubProfile]
    .map((club) => {
      const distanceGap = Math.abs(club.averageDistanceYards - targetDistance);
      const rangePenalty =
        targetDistance < club.minDistanceYards || targetDistance > club.maxDistanceYards
          ? 30
          : 0;
      const accuracyBonus = club.accuracyRating / 5;
      const strictPenalty = gameMode === "serious" && rangePenalty > 0 ? 40 : 0;
      const confidenceScore = Math.max(
        0,
        Math.round(100 - distanceGap - rangePenalty - strictPenalty + accuracyBonus),
      );

      return {
        club,
        distanceGapYards: Math.round(distanceGap),
        confidenceScore,
        reason:
          lie === "green" && club.type === "putter"
            ? "Best fit for putting."
            : `Close to ${Math.round(targetDistance)} yards with ${club.accuracyRating}/100 accuracy.`,
      };
    })
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, limit);
}

function findClub(player: Player, clubId?: string): Club | undefined {
  if (!clubId) return undefined;
  return player.clubProfile.find((club) => club.id === clubId);
}

function getPlayer(round: RoundState, playerId: string): Player {
  const player = round.players.find((item) => item.id === playerId);

  if (!player) {
    throw new Error(`Missing player ${playerId}.`);
  }

  return player;
}

// =========================================================
// SHOT OUTCOME RESOLUTION
// =========================================================

function getOutcomeMeta(outcomeType: ShotOutcomeType): {
  quality: ShotQuality;
  direction: ShotDirection;
} {
  if (outcomeType.includes("left")) return { quality: getQuality(outcomeType), direction: "left" };
  if (outcomeType.includes("right")) return { quality: getQuality(outcomeType), direction: "right" };
  return { quality: getQuality(outcomeType), direction: "center" };
}

function getQuality(outcomeType: ShotOutcomeType): ShotQuality {
  if (outcomeType.startsWith("good")) return "good";
  if (outcomeType.startsWith("short")) return "short";
  if (outcomeType.startsWith("topped")) return "topped";
  if (outcomeType.startsWith("out")) return "out-of-play";
  return "drop";
}

function resolveShotDistance(club: Club | undefined, outcomeType: ShotOutcomeType): number {
  const base = club?.averageDistanceYards ?? 100;

  if (outcomeType.startsWith("good")) {
    return rounded(base * randomBetween(0.96, 1.04));
  }

  if (outcomeType.startsWith("short")) {
    return rounded(base * randomBetween(0.45, 0.7));
  }

  if (outcomeType.startsWith("topped")) {
    return rounded(base * randomBetween(0.08, 0.18));
  }

  if (outcomeType.startsWith("out")) {
    return rounded(base * randomBetween(0.75, 1.0));
  }

  return 0;
}

function resolveLateralOffset(
  currentOffset: number,
  club: Club | undefined,
  outcomeType: ShotOutcomeType,
): number {
  const accuracy = club?.accuracyRating ?? 60;
  const centerSpread = clamp(12 - accuracy / 12, 3, 10);

  if (outcomeType.endsWith("center")) {
    return rounded(currentOffset + randomBetween(-centerSpread, centerSpread));
  }

  if (outcomeType === "good-left") return rounded(currentOffset - randomBetween(14, 28));
  if (outcomeType === "good-right") return rounded(currentOffset + randomBetween(14, 28));
  if (outcomeType === "short-left") return rounded(currentOffset - randomBetween(10, 22));
  if (outcomeType === "short-right") return rounded(currentOffset + randomBetween(10, 22));
  if (outcomeType === "topped-left") return rounded(currentOffset - randomBetween(6, 18));
  if (outcomeType === "topped-right") return rounded(currentOffset + randomBetween(6, 18));
  if (outcomeType === "out-left") return rounded(currentOffset - randomBetween(55, 90));
  if (outcomeType === "out-right") return rounded(currentOffset + randomBetween(55, 90));

  return currentOffset;
}

function resolveLieAndPlayableState(input: {
  outcomeType: ShotOutcomeType;
  remainingDistanceYards: number;
  lateralOffsetYards: number;
}): {
  lie: LieStatus;
  playableState: PlayableState;
} {
  if (input.outcomeType.startsWith("out")) {
    return {
      lie: "out-of-bounds",
      playableState: "out-of-play",
    };
  }

  if (input.remainingDistanceYards === 0) {
    return {
      lie: "holed",
      playableState: "holed",
    };
  }

  if (input.remainingDistanceYards <= 25) {
    return {
      lie: "green",
      playableState: "playable",
    };
  }

  if (Math.abs(input.lateralOffsetYards) <= 18) {
    return {
      lie: "fairway",
      playableState: "playable",
    };
  }

  return {
    lie: "rough",
    playableState: "playable",
  };
}

// =========================================================
// APPLY SHOT OR DROP OUTCOME
// =========================================================

export function applyShotOutcome(round: RoundState, input: ApplyShotOutcomeInput): RoundState {
  if (input.outcomeType === "drop-average" || input.outcomeType === "random-drop") {
    return applyDropOutcome(round, input);
  }

  const hole = getCurrentHole(round);
  const holeDistance = getHoleDistance(hole, round.teeBox);
  const player = getPlayer(round, input.playerId);
  const playerHole = getPlayerHoleState(round, input.playerId);
  const ball = getBallState(playerHole, input.ballNumber);

  const recommendedClub = recommendClubs(
    player,
    ball.remainingDistanceYards,
    ball.lie,
    round.settings.gameMode,
    1,
  )[0]?.club;

  const club = findClub(player, input.clubId) ?? recommendedClub;
  const rawShotDistance = resolveShotDistance(club, input.outcomeType);
  const distanceFromTeeAfter = clamp(
    ball.mapPosition.distanceFromTeeYards + rawShotDistance,
    0,
    holeDistance,
  );
  const shotDistanceYards = rounded(distanceFromTeeAfter - ball.mapPosition.distanceFromTeeYards);
  const lateralOffsetAfter = clamp(
    resolveLateralOffset(ball.mapPosition.lateralOffsetYards, club, input.outcomeType),
    -100,
    100,
  );
  const remainingAfter = rounded(Math.max(0, holeDistance - distanceFromTeeAfter));
  const lieAndState = resolveLieAndPlayableState({
    outcomeType: input.outcomeType,
    remainingDistanceYards: remainingAfter,
    lateralOffsetYards: lateralOffsetAfter,
  });

  const validation = validateResolvedShot({
    round,
    ball,
    club,
    outcomeType: input.outcomeType,
    shotDistanceYards: rawShotDistance,
    distanceFromTeeAfterYards: distanceFromTeeAfter,
    remainingDistanceAfterYards: remainingAfter,
  });

  throwIfErrors(validation.errors);

  const meta = getOutcomeMeta(input.outcomeType);

  const event: BallEvent = {
    id: makeId("event"),
    type: "stroke",
    eventNumber: ball.events.length + 1,
    strokeNumber: ball.strokes + 1,
    outcomeType: input.outcomeType,
    shotQuality: meta.quality,
    shotDirection: meta.direction,
    clubId: club?.id,
    clubName: club?.name,
    shotDistanceYards,
    distanceFromTeeBeforeYards: ball.mapPosition.distanceFromTeeYards,
    distanceFromTeeAfterYards: distanceFromTeeAfter,
    lateralOffsetBeforeYards: ball.mapPosition.lateralOffsetYards,
    lateralOffsetAfterYards: lateralOffsetAfter,
    remainingDistanceBeforeYards: ball.remainingDistanceYards,
    remainingDistanceAfterYards: remainingAfter,
    lieAfter: lieAndState.lie,
    playableStateAfter: lieAndState.playableState,
    penalties: 0,
    warnings: validation.warnings,
    note: input.note,
    createdAt: nowIso(),
  };

  const updatedBall: BallState = {
    ...ball,
    mapPosition: {
      distanceFromTeeYards: rounded(distanceFromTeeAfter),
      lateralOffsetYards: rounded(lateralOffsetAfter),
    },
    remainingDistanceYards: remainingAfter,
    lie: lieAndState.lie,
    playableState: lieAndState.playableState,
    events: [...ball.events, event],
    strokes: ball.strokes + 1,
  };

  const updatedPlayerRound: PlayerRoundState = {
    ...round.playerRoundStates[input.playerId],
    totalStrokesHit: round.playerRoundStates[input.playerId].totalStrokesHit + 1,
  };

  const updatedRound = replacePlayerHoleState(
    round,
    replaceBall(playerHole, updatedBall),
    updatedPlayerRound,
  );

  return addNotices(updatedRound, validation.warnings);
}

function findReferenceBall(round: RoundState, playerId: string): BallState | null {
  for (const player of round.players) {
    if (player.id === playerId) continue;

    const playerHole = round.holeStates[round.currentHoleNumber]?.[player.id];
    const playableBall = playerHole?.balls.find((ball) => ball.playableState === "playable");

    if (playableBall) return playableBall;
  }

  return null;
}

function applyDropOutcome(round: RoundState, input: ApplyShotOutcomeInput): RoundState {
  const hole = getCurrentHole(round);
  const holeDistance = getHoleDistance(hole, round.teeBox);
  const playerHole = getPlayerHoleState(round, input.playerId);
  const targetBall = getBallState(playerHole, input.ballNumber);

  const validation = validateDropAttempt({
    round,
    playerHole,
    targetBall,
    outcomeType: input.outcomeType,
  });

  throwIfErrors(validation.errors);

  const referenceBall =
    input.referencePlayerId && input.referenceBallNumber
      ? getBallState(getPlayerHoleState(round, input.referencePlayerId), input.referenceBallNumber)
      : findReferenceBall(round, input.playerId);

  const baseDistance =
    referenceBall?.mapPosition.distanceFromTeeYards ??
    Math.max(targetBall.mapPosition.distanceFromTeeYards, holeDistance * 0.45);

  const previousOffset = targetBall.mapPosition.lateralOffsetYards;
  const wasLeft = previousOffset < -35 || targetBall.events.some((event) => event.outcomeType === "out-left");
  const wasRight = previousOffset > 35 || targetBall.events.some((event) => event.outcomeType === "out-right");

  let nextPosition: BallMapPosition;

  if (input.outcomeType === "random-drop") {
    const lateralOffsetYards = wasLeft
      ? randomBetween(-55, -15)
      : wasRight
        ? randomBetween(15, 55)
        : randomBetween(-35, 35);

    nextPosition = {
      distanceFromTeeYards: rounded(clamp(baseDistance + randomBetween(-30, 25), 0, holeDistance - 5)),
      lateralOffsetYards: rounded(lateralOffsetYards),
    };
  } else {
    nextPosition = {
      distanceFromTeeYards: rounded(clamp(baseDistance + randomBetween(-12, 12), 0, holeDistance - 5)),
      lateralOffsetYards: rounded(
        clamp(referenceBall?.mapPosition.lateralOffsetYards ?? previousOffset * 0.35, -45, 45),
      ),
    };
  }

  const remainingAfter = rounded(Math.max(0, holeDistance - nextPosition.distanceFromTeeYards));
  const lieAfter: LieStatus = Math.abs(nextPosition.lateralOffsetYards) <= 20 ? "fairway" : "rough";
  const penalty = round.settings.dropPenaltyStrokes;

  const event: BallEvent = {
    id: makeId("event"),
    type: "drop",
    eventNumber: targetBall.events.length + 1,
    outcomeType: input.outcomeType,
    shotQuality: "drop",
    shotDirection: nextPosition.lateralOffsetYards < -5 ? "left" : nextPosition.lateralOffsetYards > 5 ? "right" : "center",
    shotDistanceYards: 0,
    distanceFromTeeBeforeYards: targetBall.mapPosition.distanceFromTeeYards,
    distanceFromTeeAfterYards: nextPosition.distanceFromTeeYards,
    lateralOffsetBeforeYards: targetBall.mapPosition.lateralOffsetYards,
    lateralOffsetAfterYards: nextPosition.lateralOffsetYards,
    remainingDistanceBeforeYards: targetBall.remainingDistanceYards,
    remainingDistanceAfterYards: remainingAfter,
    lieAfter,
    playableStateAfter: "playable",
    penalties: penalty,
    warnings: validation.warnings,
    note: input.note,
    createdAt: nowIso(),
  };

  const updatedBall: BallState = {
    ...targetBall,
    mapPosition: nextPosition,
    remainingDistanceYards: remainingAfter,
    lie: lieAfter,
    playableState: "playable",
    events: [...targetBall.events, event],
    penalties: targetBall.penalties + penalty,
  };

  const currentPlayerRound = round.playerRoundStates[input.playerId];

  const updatedPlayerRound: PlayerRoundState = {
    ...currentPlayerRound,
    dropsRemaining:
      currentPlayerRound.dropsRemaining === null
        ? null
        : Math.max(0, currentPlayerRound.dropsRemaining - 1),
    totalPenalties: currentPlayerRound.totalPenalties + penalty,
  };

  const updatedRound = replacePlayerHoleState(
    round,
    replaceBall(playerHole, updatedBall),
    updatedPlayerRound,
  );

  return addNotices(updatedRound, validation.warnings);
}

// =========================================================
// BASIC SCORE MODE
// =========================================================

export function adjustBasicScore(round: RoundState, input: BasicScoreAdjustmentInput): RoundState {
  const currentPlayerScores = round.basicScores[input.playerId];

  if (!currentPlayerScores) {
    throw new Error("Missing player score state.");
  }

  const currentHoleScore = currentPlayerScores.scoresByHole[input.holeNumber];

  if (!currentHoleScore) {
    throw new Error("Missing hole score state.");
  }

  const nextScore = currentHoleScore.score + input.delta;

  const validation = validateBasicScore({
    round,
    playerId: input.playerId,
    holeNumber: input.holeNumber,
    nextScore,
  });

  throwIfErrors(validation.errors);

  return {
    ...round,
    updatedAt: nowIso(),
    basicScores: {
      ...round.basicScores,
      [input.playerId]: {
        ...currentPlayerScores,
        scoresByHole: {
          ...currentPlayerScores.scoresByHole,
          [input.holeNumber]: {
            ...currentHoleScore,
            score: nextScore,
          },
        },
      },
    },
  };
}

export function getBasicScoreLabel(score: number, par: number): ScoreLabel {
  const vsPar = score - par;

  if (vsPar <= -2) return "Eagle or better";
  if (vsPar === -1) return "Birdie";
  if (vsPar === 0) return "Par";
  if (vsPar === 1) return "Bogey";
  if (vsPar === 2) return "Double Bogey";
  return "Triple+";
}

// =========================================================
// ROUND NAVIGATION + COMPLETION
// =========================================================

export function finishCurrentHole(round: RoundState): RoundState {
  const validation = validateFinishHole(round);
  throwIfErrors(validation.errors);

  if (round.settings.basicScoringOnly) {
    const nextScores = { ...round.basicScores };

    for (const player of round.players) {
      const playerScores = nextScores[player.id];
      const currentScore = playerScores.scoresByHole[round.currentHoleNumber];

      nextScores[player.id] = {
        ...playerScores,
        scoresByHole: {
          ...playerScores.scoresByHole,
          [round.currentHoleNumber]: {
            ...currentScore,
            completed: true,
          },
        },
      };
    }

    return addNotices(
      {
        ...round,
        basicScores: nextScores,
        updatedAt: nowIso(),
      },
      validation.warnings,
    );
  }

  const currentHoleStates = round.holeStates[round.currentHoleNumber];
  const updatedHoleStates: Record<string, PlayerHoleState> = {};

  for (const player of round.players) {
    updatedHoleStates[player.id] = {
      ...currentHoleStates[player.id],
      holeComplete: true,
    };
  }

  return addNotices(
    {
      ...round,
      updatedAt: nowIso(),
      holeStates: {
        ...round.holeStates,
        [round.currentHoleNumber]: updatedHoleStates,
      },
    },
    validation.warnings,
  );
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

// =========================================================
// SCORECARD HELPERS
// =========================================================

export function getPlayerHoleDisplayScore(
  round: RoundState,
  playerId: string,
  holeNumber: number,
): number | null {
  if (round.settings.basicScoringOnly) {
    return round.basicScores[playerId]?.scoresByHole[holeNumber]?.score ?? null;
  }

  const playerHole = round.holeStates[holeNumber]?.[playerId];

  if (!playerHole) return null;

  const scoredBalls = playerHole.balls.filter((ball) => ball.events.length > 0);

  if (scoredBalls.length === 0) return null;

  return Math.min(...scoredBalls.map((ball) => ball.strokes + ball.penalties));
}

export function getPlayerTotalScore(round: RoundState, playerId: string): number {
  return round.course.holes.reduce((total, hole) => {
    const score = getPlayerHoleDisplayScore(round, playerId, hole.holeNumber);
    return total + (score ?? 0);
  }, 0);
}

export function getPlayerTotalVsPar(round: RoundState, playerId: string): number {
  return round.course.holes.reduce((total, hole) => {
    const score = getPlayerHoleDisplayScore(round, playerId, hole.holeNumber);
    return score === null ? total : total + score - hole.par;
  }, 0);
}

export function formatVsPar(value: number): string {
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : `${value}`;
}

export { areAllPlayerBallsUnavailable };
