// ── Heading & Turn Modes ─────────────────────────────────

export type HeadingMode =
  | "followWayline"
  | "manually"
  | "fixed"
  | "smoothTransition"
  | "towardPOI";

export type TurnMode =
  | "coordinateTurn"
  | "toPointAndStopWithDiscontinuityCurvature"
  | "toPointAndStopWithContinuityCurvature"
  | "toPointAndPassWithContinuityCurvature";

export type HeightMode = "EGM96" | "relativeToStartPoint" | "aboveGroundLevel";

export type FlyToWaylineMode = "safely" | "pointToPoint";

export type FinishAction =
  | "goHome"
  | "noAction"
  | "autoLand"
  | "gotoFirstWaypoint";

export type RCLostAction = "goBack" | "landing" | "hover";

export type GimbalPitchMode = "manual" | "usePointSetting";

// ── Action Types ─────────────────────────────────────────

export type ActionType =
  | "takePhoto"
  | "startRecord"
  | "stopRecord"
  | "gimbalRotate"
  | "gimbalEvenlyRotate"
  | "rotateYaw"
  | "hover"
  | "zoom"
  | "focus";

export interface TakePhotoParams {
  payloadPositionIndex: number;
  fileSuffix?: string;
}

export interface StartRecordParams {
  payloadPositionIndex: number;
  fileSuffix?: string;
}

export interface StopRecordParams {
  payloadPositionIndex: number;
}

export interface GimbalRotateParams {
  gimbalPitchRotateAngle: number; // -120 to 45
  gimbalYawRotateAngle: number; // -180 to 180
  gimbalRollRotateAngle: number; // typically 0
  gimbalRotateMode: "absoluteAngle";
  payloadPositionIndex: number;
}

export interface GimbalEvenlyRotateParams {
  gimbalPitchRotateAngle: number; // -120 to 45 — target pitch at this waypoint
  payloadPositionIndex: number;
}

export interface RotateYawParams {
  aircraftHeading: number; // -180 to 180
  aircraftPathMode: "clockwise" | "counterClockwise";
}

export interface HoverParams {
  hoverTime: number; // seconds
}

export interface ZoomParams {
  focalLength: number; // mm
}

export interface FocusParams {
  isPointFocus: boolean;
  focusX?: number;
  focusY?: number;
  isInfiniteFocus?: boolean;
}

export type ActionParams =
  | TakePhotoParams
  | StartRecordParams
  | StopRecordParams
  | GimbalRotateParams
  | GimbalEvenlyRotateParams
  | RotateYawParams
  | HoverParams
  | ZoomParams
  | FocusParams;

export interface WaypointAction {
  actionId: number;
  actionType: ActionType;
  params: ActionParams;
}

// ── Drone & Payload ──────────────────────────────────────

export interface DroneModel {
  id: string;
  label: string;
  droneEnumValue: number;
  droneSubEnumValue: number;
  flightApp: FlightApp;
  kmzProfile: KmzProfile;
  payloads: PayloadModel[] | null;
}

export interface PayloadModel {
  label: string;
  payloadEnumValue: number;
}

export type FlightApp = "djiPilot" | "djiFly";

export type KmzProfile = "standardWpml" | "djiFly";

export const DRONE_MODELS: DroneModel[] = [
  {
    id: "m300-rtk",
    label: "DJI M300 RTK",
    droneEnumValue: 60,
    droneSubEnumValue: 0,
    flightApp: "djiPilot",
    kmzProfile: "standardWpml",
    payloads: [
      { label: "H20", payloadEnumValue: 42 },
      { label: "H20T", payloadEnumValue: 43 },
      { label: "H20N", payloadEnumValue: 61 },
      { label: "PSDK", payloadEnumValue: 65534 },
    ],
  },
  {
    id: "m30",
    label: "DJI M30",
    droneEnumValue: 67,
    droneSubEnumValue: 0,
    flightApp: "djiPilot",
    kmzProfile: "standardWpml",
    payloads: [{ label: "M30 Camera", payloadEnumValue: 52 }],
  },
  {
    id: "m30t",
    label: "DJI M30T",
    droneEnumValue: 67,
    droneSubEnumValue: 1,
    flightApp: "djiPilot",
    kmzProfile: "standardWpml",
    payloads: [{ label: "M30T Camera", payloadEnumValue: 53 }],
  },
  {
    // droneEnumValue 68 appears in real DJI KMZ files (likely Dock-paired M30 variant)
    id: "m30-dock",
    label: "DJI M30 (Dock)",
    droneEnumValue: 68,
    droneSubEnumValue: 0,
    flightApp: "djiPilot",
    kmzProfile: "standardWpml",
    payloads: [
      { label: "M30 Camera", payloadEnumValue: 52 },
      { label: "M30T Camera", payloadEnumValue: 53 },
    ],
  },
  {
    id: "mavic-3e",
    label: "DJI Mavic 3E",
    droneEnumValue: 77,
    droneSubEnumValue: 0,
    flightApp: "djiPilot",
    kmzProfile: "standardWpml",
    payloads: [{ label: "M3E Camera", payloadEnumValue: 66 }],
  },
  {
    id: "mavic-3t",
    label: "DJI Mavic 3T",
    droneEnumValue: 77,
    droneSubEnumValue: 1,
    flightApp: "djiPilot",
    kmzProfile: "standardWpml",
    payloads: [{ label: "M3T Camera", payloadEnumValue: 67 }],
  },
  {
    id: "mavic-3m",
    label: "DJI Mavic 3M",
    droneEnumValue: 77,
    droneSubEnumValue: 2,
    flightApp: "djiPilot",
    kmzProfile: "standardWpml",
    payloads: [{ label: "M3M Camera", payloadEnumValue: 68 }],
  },
  {
    id: "m350-rtk",
    label: "DJI M350 RTK",
    droneEnumValue: 89,
    droneSubEnumValue: 0,
    flightApp: "djiPilot",
    kmzProfile: "standardWpml",
    payloads: [
      { label: "H20", payloadEnumValue: 42 },
      { label: "H20T", payloadEnumValue: 43 },
      { label: "H20N", payloadEnumValue: 61 },
      { label: "H30", payloadEnumValue: 82 },
      { label: "H30T", payloadEnumValue: 83 },
      { label: "PSDK", payloadEnumValue: 65534 },
    ],
  },
  {
    id: "mavic-3d",
    label: "DJI Mavic 3D",
    droneEnumValue: 91,
    droneSubEnumValue: 0,
    flightApp: "djiPilot",
    kmzProfile: "standardWpml",
    payloads: [{ label: "M3D Camera", payloadEnumValue: 80 }],
  },
  {
    id: "mavic-3td",
    label: "DJI Mavic 3TD",
    droneEnumValue: 91,
    droneSubEnumValue: 1,
    flightApp: "djiPilot",
    kmzProfile: "standardWpml",
    payloads: [{ label: "M3TD Camera", payloadEnumValue: 81 }],
  },
  {
    id: "mini-4-pro",
    label: "DJI Mini 4 Pro",
    droneEnumValue: 100,
    droneSubEnumValue: 0,
    flightApp: "djiFly",
    kmzProfile: "djiFly",
    payloads: [{ label: "Mini 4 Pro Camera", payloadEnumValue: 100 }],
  },
  {
    id: "lito-x1",
    label: "DJI LITO X1",
    droneEnumValue: 68,
    droneSubEnumValue: 0,
    flightApp: "djiFly",
    kmzProfile: "djiFly",
    payloads: null,
  },
];

export function getDroneModelById(id?: string): DroneModel | undefined {
  if (!id) return undefined;
  return DRONE_MODELS.find((model) => model.id === id);
}

export function findDroneModelByMetadata(config: {
  droneEnumValue: number;
  droneSubEnumValue: number;
  payloadEnumValue?: number;
}): DroneModel | undefined {
  const matches = DRONE_MODELS.filter(
    (model) =>
      model.droneEnumValue === config.droneEnumValue &&
      model.droneSubEnumValue === config.droneSubEnumValue &&
      (config.payloadEnumValue == null ||
        model.payloads?.some(
          (payload) => payload.payloadEnumValue === config.payloadEnumValue,
        )),
  );

  return matches.length === 1 ? matches[0] : undefined;
}

export function resolveDroneModel(config: {
  droneModelId?: string;
  droneEnumValue: number;
  droneSubEnumValue: number;
  payloadEnumValue?: number;
  kmzProfile?: KmzProfile;
}): DroneModel | undefined {
  const modelById = getDroneModelById(config.droneModelId);
  if (modelById) return modelById;

  const modelByMetadata = findDroneModelByMetadata(config);
  if (
    config.kmzProfile &&
    modelByMetadata &&
    modelByMetadata.kmzProfile !== config.kmzProfile
  ) {
    return undefined;
  }
  return modelByMetadata;
}

export function resolveKmzProfile(config: {
  droneModelId?: string;
  droneEnumValue: number;
  droneSubEnumValue: number;
  payloadEnumValue?: number;
  kmzProfile?: KmzProfile;
}): KmzProfile {
  return (
    config.kmzProfile || resolveDroneModel(config)?.kmzProfile || "standardWpml"
  );
}

// ── Point of Interest ────────────────────────────────────

export interface PointOfInterest {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  height: number;
}

// ── Obstacle ─────────────────────────────────────────────

export interface Obstacle {
  id: string;
  name: string;
  description: string;
  vertices: [number, number][]; // Array of [latitude, longitude] pairs
}

// ── Waypoint ─────────────────────────────────────────────

export interface Waypoint {
  index: number;
  name: string;
  latitude: number;
  longitude: number;
  height: number;
  speed: number;
  useGlobalSpeed: boolean;
  useGlobalHeight: boolean;
  useGlobalHeadingParam: boolean;
  useGlobalTurnParam: boolean;
  headingMode?: HeadingMode;
  headingAngle?: number;
  poiId?: string; // Reference to PointOfInterest when headingMode = "towardPOI"
  turnMode?: TurnMode;
  turnDampingDist?: number;
  gimbalPitchAngle: number;
  actions: WaypointAction[];
}

// ── Mission Config ───────────────────────────────────────

export interface MissionConfig {
  droneModelId?: string;
  droneEnumValue: number;
  droneSubEnumValue: number;
  payloadEnumValue: number;
  kmzProfile?: KmzProfile;
  flyToWaylineMode: FlyToWaylineMode;
  finishAction: FinishAction;
  exitOnRCLost: "goContinue" | "executeLostAction";
  executeRCLostAction: RCLostAction;
  takeOffSecurityHeight: number;
  globalTransitionalSpeed: number;
  autoFlightSpeed: number;
  maxBatteryMinutes: number;
  heightMode: HeightMode;
  globalHeadingMode: HeadingMode;
  globalTurnMode: TurnMode;
  gimbalPitchMode: GimbalPitchMode;
}

// ── Mission ──────────────────────────────────────────────

export interface Mission {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  config: MissionConfig;
  waypoints: Waypoint[];
  pois: PointOfInterest[];
  obstacles: Obstacle[];
}

// ── Shared Mission ──────────────────────────────────────

export interface SharedMission {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  shareToken: string;
  ownerEmail?: string;
  config: MissionConfig;
  waypoints: Waypoint[];
  pois: PointOfInterest[];
  obstacles: Obstacle[];
}

// ── Admin ────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  missionCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  perPage: number;
  total: number;
}

// ── Default Config ───────────────────────────────────────

export const DEFAULT_MISSION_CONFIG: MissionConfig = {
  droneModelId: "mavic-3e",
  droneEnumValue: 77,
  droneSubEnumValue: 0,
  payloadEnumValue: 66,
  kmzProfile: "standardWpml",
  flyToWaylineMode: "safely",
  finishAction: "goHome",
  exitOnRCLost: "executeLostAction",
  executeRCLostAction: "goBack",
  takeOffSecurityHeight: 20,
  globalTransitionalSpeed: 10,
  autoFlightSpeed: 7,
  maxBatteryMinutes: 25,
  heightMode: "aboveGroundLevel",
  globalHeadingMode: "followWayline",
  globalTurnMode: "toPointAndStopWithDiscontinuityCurvature",
  gimbalPitchMode: "usePointSetting",
};

export const DEFAULT_WAYPOINT: Omit<
  Waypoint,
  "index" | "name" | "latitude" | "longitude"
> = {
  height: 30,
  speed: 7,
  useGlobalSpeed: true,
  useGlobalHeight: false,
  useGlobalHeadingParam: true,
  useGlobalTurnParam: true,
  gimbalPitchAngle: -45,
  actions: [],
};
