// src/game/types.ts

// =========================================================
// COURSE BUILDER TYPES
// =========================================================

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

// =========================================================
// PLAYER + CLUB TYPES
// =========================================================

export type ClubType =
  | "driver"
  | "wood"
  | "hybrid"
  | "iron"
  | "wedge"
  | "putter"
  | "other";

export type ClubMissTendency =
  | "left"
  | "right"
  | "short"
  | "long"
  | "balanced";

export type Club = {
  id: string;
  name: string;
  type: ClubType;
  averageDistanceYards: number;
  minDistanceYards: number;
  maxDistanceYards: number;
  accuracyRating: number; // 1-100
  missTendency: ClubMissTendency;
  notes?: string;
};

export type Player = {
  id: string;
  name: string;
  preferredTeeBox?: string;
  clubProfile: Club[];
};

// =========================================================
// GAME MODE TYPES
// =========================================================

export type GameModeId =
  | "basic"
  | "three-ball-drop"
  | "one-ball-drop"
  | "serious";

export type GameModeDefinition = {
  id: GameModeId;
  title: string;
  shortName: string;
  description: string;
  rules: string[];
};

export type BallsPerPlayer = 1 | 2 | 3;
export type BallNumber = 1 | 2 | 3;

export type RoundSettings = {
  gameMode: GameModeId;
  ballsPerPlayer: BallsPerPlayer;
  dropPenaltyStrokes: number;
  singleBallStartingDrops: number;
  allowDropNearOtherPlayersBall: boolean;
  allowRandomDrop: boolean;
  strictMode: boolean;
  shotTrackingEnabled: boolean;
  basicScoringOnly: boolean;
};

// =========================================================
// BALL AVATAR TYPES
// =========================================================

export type BallMarkerStyle = "circle" | "square" | "diamond";

export type BallAvatar = {
  color: string;
  numberLabel: string;
  name: string;
  emoji: string;
  markerStyle: BallMarkerStyle;
};

// =========================================================
// SHOT OUTCOME TYPES
// =========================================================

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

export type PlayableState =
  | "playable"
  | "unplayable"
  | "out-of-play"
  | "lost"
  | "holed";

export type ShotQuality =
  | "good"
  | "short"
  | "topped"
  | "out-of-play"
  | "drop";

export type ShotDirection = "center" | "left" | "right";

export type ShotOutcomeType =
  | "good-center"
  | "good-left"
  | "good-right"
  | "short-center"
  | "short-left"
  | "short-right"
  | "topped-center"
  | "topped-left"
  | "topped-right"
  | "out-left"
  | "out-right"
  | "drop-average"
  | "random-drop";

export type BallMapPosition = {
  distanceFromTeeYards: number;
  lateralOffsetYards: number;
};

export type BallEventType = "stroke" | "drop" | "penalty";

export type BallEvent = {
  id: string;
  type: BallEventType;
  eventNumber: number;
  strokeNumber?: number;
  outcomeType?: ShotOutcomeType;
  shotQuality?: ShotQuality;
  shotDirection?: ShotDirection;
  clubId?: string;
  clubName?: string;
  shotDistanceYards: number;
  distanceFromTeeBeforeYards: number;
  distanceFromTeeAfterYards: number;
  lateralOffsetBeforeYards: number;
  lateralOffsetAfterYards: number;
  remainingDistanceBeforeYards: number;
  remainingDistanceAfterYards: number;
  lieAfter: LieStatus;
  playableStateAfter: PlayableState;
  penalties: number;
  warnings: string[];
  note?: string;
  createdAt: string;
};

export type BallState = {
  ballNumber: BallNumber;
  avatar: BallAvatar;
  startingDistanceYards: number;
  mapPosition: BallMapPosition;
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
  dropsRemaining: number | null;
  totalStrokesHit: number;
  totalPenalties: number;
};

// =========================================================
// BASIC SCORE MODE TYPES
// =========================================================

export type BasicHoleScore = {
  holeNumber: number;
  score: number;
  completed: boolean;
};

export type BasicPlayerScoreState = {
  playerId: string;
  scoresByHole: Record<number, BasicHoleScore>;
};

export type ScoreLabel =
  | "Eagle or better"
  | "Birdie"
  | "Par"
  | "Bogey"
  | "Double Bogey"
  | "Triple+";

// =========================================================
// ROUND TYPES
// =========================================================

export type RoundNotice = {
  id: string;
  type: "warning" | "info";
  message: string;
  createdAt: string;
};

export type RoundState = {
  id: string;
  course: Course;
  teeBox: string;
  players: Player[];
  settings: RoundSettings;
  currentHoleNumber: number;
  basicScores: Record<string, BasicPlayerScoreState>;
  playerRoundStates: Record<string, PlayerRoundState>;
  holeStates: Record<number, Record<string, PlayerHoleState>>;
  notices: RoundNotice[];
  startedAt: string;
  updatedAt: string;
};

// =========================================================
// ENGINE INPUT TYPES
// =========================================================

export type ApplyShotOutcomeInput = {
  playerId: string;
  ballNumber: BallNumber;
  outcomeType: ShotOutcomeType;
  clubId?: string;
  referencePlayerId?: string;
  referenceBallNumber?: BallNumber;
  note?: string;
};

export type BasicScoreAdjustmentInput = {
  playerId: string;
  holeNumber: number;
  delta: number;
};

export type ClubRecommendation = {
  club: Club;
  distanceGapYards: number;
  confidenceScore: number;
  reason: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};
