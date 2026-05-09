// src/game/types.ts

// ---------------------------------------------------------
// COURSE BUILDER TYPES
// These define our standardized internal course format.
// Later, OCR, imports, GPS, and Supabase should all convert
// into this same shape.
// ---------------------------------------------------------

export type HoleShape =
  | "straight"
  | "dogleg-left"
  | "dogleg-right"
  | "double-dogleg"
  | "island-green"
  | "split-fairway";

export type HazardType =
  | "water"
  | "bunker"
  | "trees"
  | "out-of-bounds"
  | "native-area"
  | "ravine"
  | "other";

export type HazardSide = "left" | "right" | "center" | "short" | "long";

export type CourseSource =
  | "manual"
  | "tee-sign-ocr"
  | "scorecard-photo"
  | "course-website"
  | "community";

export type TeeDistances = Record<string, number>;

export type HoleHazard = {
  id: string;
  type: HazardType;
  name: string;
  side?: HazardSide;
  distanceFromTeeYards?: number;
  notes?: string;
};

export type CourseHole = {
  holeNumber: number;
  par: number;
  handicap: number;
  teeDistances: TeeDistances;
  shape: HoleShape;
  hazards: HoleHazard[];
  notes?: string;
  strategyTips: string[];
  photoUris: string[];
};

export type Course = {
  id: string;
  name: string;
  location?: string;
  source: CourseSource;
  holes: CourseHole[];
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------
// PLAYER + CLUB TYPES
// Club recommendations come from each player's own distances.
// ---------------------------------------------------------

export type ClubType =
  | "driver"
  | "wood"
  | "hybrid"
  | "iron"
  | "wedge"
  | "putter"
  | "other";

export type Club = {
  id: string;
  name: string;
  type: ClubType;
  averageDistanceYards: number;
  minDistanceYards?: number;
  maxDistanceYards?: number;
  notes?: string;
};

export type Player = {
  id: string;
  name: string;
  preferredTeeBox?: string;
  clubProfile: Club[];
};

// ---------------------------------------------------------
// GAME + ROUND TYPES
// These are intentionally flexible enough for standard golf,
// 3-ball golf, and later custom modes.
// ---------------------------------------------------------

export type GameModeId = "standard" | "three-ball" | "custom";

export type BallsPerPlayer = 1 | 2 | 3;

export type BallNumber = 1 | 2 | 3;

export type LieStatus =
  | "tee"
  | "fairway"
  | "rough"
  | "sand"
  | "green"
  | "hazard"
  | "out-of-bounds"
  | "lost"
  | "drop-zone"
  | "holed";

export type PlayableState = "playable" | "unplayable" | "lost" | "holed";

export type BallEventType = "stroke" | "drop" | "penalty";

export type BallEvent = {
  id: string;
  type: BallEventType;

  // Event number counts everything that happened to this ball.
  eventNumber: number;

  // Stroke number only exists for actual golf swings.
  strokeNumber?: number;

  clubId?: string;
  distanceYards: number;

  remainingDistanceBeforeYards: number;
  remainingDistanceAfterYards: number;

  lieAfter: LieStatus;
  playableStateAfter: PlayableState;

  penalties: number;
  note?: string;
  createdAt: string;
};

export type BallState = {
  ballNumber: BallNumber;
  startingDistanceYards: number;
  remainingDistanceYards: number;
  lie: LieStatus;
  playableState: PlayableState;
  events: BallEvent[];
  strokes: number;
  penalties: number;
};

export type PlayerHoleState = {
  playerId: string;
  holeNumber: number;
  balls: BallState[];
  selectedBallNumber: BallNumber;
  holeComplete: boolean;
};

export type PlayerRoundState = {
  playerId: string;

  // Null means unlimited/not tracked for that mode.
  dropsRemaining: number | null;

  totalStrokesHit: number;
  totalPenalties: number;
};

export type RoundSettings = {
  gameMode: GameModeId;
  ballsPerPlayer: BallsPerPlayer;
  dropPenaltyStrokes: number;

  // 3-Ball special rule:
  // If player starts with only 1 ball, they get 5 drops.
  singleBallStartingDrops: number;

  // Allows dropping near another player's playable ball.
  allowDropNearOtherPlayersBall: boolean;
};

export type RoundState = {
  id: string;
  course: Course;
  teeBox: string;
  players: Player[];
  settings: RoundSettings;
  currentHoleNumber: number;
  playerRoundStates: Record<string, PlayerRoundState>;
  holeStates: Record<number, Record<string, PlayerHoleState>>;
  startedAt: string;
  updatedAt: string;
};

export type RecordShotInput = {
  playerId: string;
  ballNumber: BallNumber;
  clubId?: string;
  distanceYards: number;
  lieAfter: LieStatus;
  playableStateAfter?: PlayableState;
  penalties?: number;
  note?: string;
};

export type MarkBallUnplayableInput = {
  playerId: string;
  ballNumber: BallNumber;
  note?: string;
};

export type DropBallInput = {
  playerId: string;
  ballNumber: BallNumber;
  referencePlayerId: string;
  referenceBallNumber: BallNumber;
  lieAfter?: LieStatus;
  note?: string;
};

export type ClubRecommendation = {
  club: Club;
  distanceGapYards: number;
  reason: string;
};
