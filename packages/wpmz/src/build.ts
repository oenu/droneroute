import { nowForProfile, profileForDocument } from "./profiles.js";
import type {
  ActionGroup,
  ActionTrigger,
  DroneInfo,
  MissionConfig,
  PayloadInfo,
  TemplateFolder,
  TemplateWaypoint,
  WaylineCoordinateSysParam,
  WaylineFolder,
  WaypointGimbalHeadingParam,
  WaypointHeadingParam,
  WaypointTurnParam,
  WpmzAction,
  WpmzDocument,
  WpmzFiles,
  WpmzProfile,
  XmlElement,
  XmlNode,
} from "./types.js";
import {
  formatCoordinate,
  formatLatLonAltCoordinate,
  formatNumber,
  makeElement,
  makeTextElement,
  serializeDocument,
} from "./xml.js";

export interface BuildOptions {
  readonly profile?: WpmzProfile;
  readonly pretty?: boolean;
  /** Use original uploaded files byte-for-byte when no mutation is requested. */
  readonly preferOriginal?: boolean;
}

export function buildWpmzFiles(
  document: WpmzDocument,
  options: BuildOptions = {},
): WpmzFiles {
  if (
    options.preferOriginal &&
    document.original?.templateKml &&
    document.original.waylinesWpml
  ) {
    return {
      templateKml: document.original.templateKml,
      waylinesWpml: document.original.waylinesWpml,
    };
  }
  const profile = profileForDocument(document, options.profile);
  return {
    templateKml: buildTemplateKml(document, { ...options, profile }),
    waylinesWpml: buildWaylinesWpml(document, { ...options, profile }),
  };
}

export function buildTemplateKml(
  document: WpmzDocument,
  options: BuildOptions = {},
): string {
  const profile = profileForDocument(document, options.profile);
  const pretty = options.pretty ?? true;
  const docChildren: XmlNode[] = [
    ...metadataElements(document, profile),
    missionConfigElement(document.missionConfig, profile),
  ];

  const templateFolder =
    document.templateFolder ?? synthesizeTemplateFolder(document);
  if (profile.templateStyle === "full-waypoint" && templateFolder) {
    docChildren.push(templateFolderElement(templateFolder));
  }

  return serializeDocument(
    kmlRoot(document, profile, [makeElement("Document", docChildren)]),
    pretty,
  );
}

export function buildWaylinesWpml(
  document: WpmzDocument,
  options: BuildOptions = {},
): string {
  const profile = profileForDocument(document, options.profile);
  const pretty = options.pretty ?? true;
  const waylines =
    document.waylines.length > 0
      ? document.waylines
      : [synthesizeWaylineFolder(document)];
  const docChildren: XmlNode[] = [
    missionConfigElement(document.missionConfig, profile),
  ];
  docChildren.push(
    ...waylines.map((wayline) => waylineFolderElement(wayline, profile)),
  );
  return serializeDocument(
    kmlRoot(document, profile, [makeElement("Document", docChildren)]),
    pretty,
  );
}

function kmlRoot(
  document: WpmzDocument,
  profile: WpmzProfile,
  children: readonly XmlNode[],
): XmlElement {
  return makeElement("kml", children, {
    xmlns: document.kmlNamespace || profile.kmlNamespace,
    "xmlns:wpml": profile.wpmlNamespace || document.wpmlNamespace,
  });
}

function metadataElements(
  document: WpmzDocument,
  profile: WpmzProfile,
): XmlNode[] {
  const metadata = document.metadata;
  const createTime = metadata.createTime ?? nowForProfile(profile);
  const updateTime = metadata.updateTime ?? createTime;
  return compactNodes([
    wpmlTextIf("author", metadata.author),
    wpmlText("createTime", createTime),
    wpmlText("updateTime", updateTime),
    ...(metadata.extraElements ?? []),
  ]);
}

function missionConfigElement(
  config: MissionConfig,
  profile: WpmzProfile,
): XmlElement {
  const includePayload = shouldInclude(
    profile.includePayloadInfo,
    config.payloadInfo !== undefined,
  );
  const includeTakeoff = shouldInclude(
    profile.includeTakeOffSecurityHeight,
    config.takeOffSecurityHeight !== undefined,
  );

  return makeElement(
    "wpml:missionConfig",
    compactNodes([
      wpmlTextIf("flyToWaylineMode", config.flyToWaylineMode),
      wpmlTextIf("finishAction", config.finishAction),
      wpmlTextIf("exitOnRCLost", config.exitOnRCLost),
      wpmlTextIf("executeRCLostAction", config.executeRCLostAction),
      includeTakeoff
        ? wpmlText("takeOffSecurityHeight", config.takeOffSecurityHeight ?? 20)
        : undefined,
      config.takeOffRefPoint
        ? wpmlText(
            "takeOffRefPoint",
            formatLatLonAltCoordinate(config.takeOffRefPoint),
          )
        : undefined,
      wpmlTextIf("takeOffRefPointAGLHeight", config.takeOffRefPointAGLHeight),
      wpmlTextIf("globalTransitionalSpeed", config.globalTransitionalSpeed),
      config.droneInfo ? droneInfoElement(config.droneInfo) : undefined,
      includePayload && config.payloadInfo
        ? payloadInfoElement(config.payloadInfo)
        : undefined,
      ...(config.extraElements ?? []),
    ]),
  );
}

function droneInfoElement(info: DroneInfo): XmlElement {
  return makeElement(
    "wpml:droneInfo",
    compactNodes([
      wpmlTextIf("droneEnumValue", info.droneEnumValue),
      wpmlTextIf("droneSubEnumValue", info.droneSubEnumValue),
      ...(info.extraElements ?? []),
    ]),
  );
}

function payloadInfoElement(info: PayloadInfo): XmlElement {
  return makeElement(
    "wpml:payloadInfo",
    compactNodes([
      wpmlTextIf("payloadEnumValue", info.payloadEnumValue),
      wpmlTextIf("payloadPositionIndex", info.payloadPositionIndex),
      ...(info.extraElements ?? []),
    ]),
  );
}

function coordinateSysParamElement(
  param: WaylineCoordinateSysParam,
): XmlElement {
  return makeElement(
    "wpml:waylineCoordinateSysParam",
    compactNodes([
      wpmlTextIf("coordinateMode", param.coordinateMode),
      wpmlTextIf("heightMode", param.heightMode),
      wpmlTextIf("globalShootHeight", param.globalShootHeight),
      wpmlTextIf("positioningType", param.positioningType),
      wpmlTextIf("surfaceFollowModeEnable", param.surfaceFollowModeEnable),
      wpmlTextIf("surfaceRelativeHeight", param.surfaceRelativeHeight),
      ...(param.extraElements ?? []),
    ]),
  );
}

function templateFolderElement(folder: TemplateFolder): XmlElement {
  return makeElement(
    "Folder",
    compactNodes([
      wpmlTextIf("templateType", folder.templateType),
      wpmlTextIf("templateId", folder.templateId),
      folder.waylineCoordinateSysParam
        ? coordinateSysParamElement(folder.waylineCoordinateSysParam)
        : undefined,
      wpmlTextIf("autoFlightSpeed", folder.autoFlightSpeed),
      wpmlTextIf("gimbalPitchMode", folder.gimbalPitchMode),
      folder.globalWaypointHeadingParam
        ? headingParamElement(
            "globalWaypointHeadingParam",
            folder.globalWaypointHeadingParam,
          )
        : undefined,
      wpmlTextIf("globalWaypointTurnMode", folder.globalWaypointTurnMode),
      wpmlTextIf("globalUseStraightLine", folder.globalUseStraightLine),
      wpmlTextIf("globalHeight", folder.globalHeight),
      ...(folder.extraElements ?? []),
      ...folder.waypoints.map(templateWaypointElement),
    ]),
  );
}

function templateWaypointElement(waypoint: TemplateWaypoint): XmlElement {
  return makeElement(
    "Placemark",
    compactNodes([
      pointElement(waypoint.coordinate),
      wpmlText("index", waypoint.index),
      wpmlTextIf("ellipsoidHeight", waypoint.ellipsoidHeight),
      wpmlTextIf("height", waypoint.height),
      wpmlTextIf("useGlobalHeight", waypoint.useGlobalHeight),
      wpmlTextIf("useGlobalSpeed", waypoint.useGlobalSpeed),
      wpmlTextIf("waypointSpeed", waypoint.waypointSpeed),
      wpmlTextIf("useGlobalHeadingParam", waypoint.useGlobalHeadingParam),
      waypoint.waypointHeadingParam
        ? headingParamElement(
            "waypointHeadingParam",
            waypoint.waypointHeadingParam,
          )
        : undefined,
      wpmlTextIf("useGlobalTurnParam", waypoint.useGlobalTurnParam),
      waypoint.waypointTurnParam
        ? turnParamElement(waypoint.waypointTurnParam)
        : undefined,
      wpmlTextIf("useStraightLine", waypoint.useStraightLine),
      wpmlTextIf("gimbalPitchAngle", waypoint.gimbalPitchAngle),
      ...(waypoint.extraElements ?? []),
      ...waypoint.actionGroups.map((g) => actionGroupElement(g)),
    ]),
  );
}

function waylineFolderElement(
  folder: WaylineFolder,
  profile: WpmzProfile,
): XmlElement {
  const includeDistance = shouldInclude(
    profile.includeWaylineDistanceDuration,
    folder.distance !== undefined,
  );
  const includeDuration = shouldInclude(
    profile.includeWaylineDistanceDuration,
    folder.duration !== undefined,
  );
  return makeElement(
    "Folder",
    compactNodes([
      wpmlTextIf("templateId", folder.templateId),
      profile.waylineHeightModeElement === "executeHeightMode"
        ? wpmlTextIf("executeHeightMode", folder.executeHeightMode)
        : undefined,
      wpmlTextIf("waylineId", folder.waylineId),
      includeDistance ? wpmlText("distance", folder.distance ?? 0) : undefined,
      includeDuration ? wpmlText("duration", folder.duration ?? 0) : undefined,
      wpmlTextIf("autoFlightSpeed", folder.autoFlightSpeed),
      profile.waylineHeightModeElement === "waylineCoordinateSysParam" &&
      folder.waylineCoordinateSysParam
        ? coordinateSysParamElement(folder.waylineCoordinateSysParam)
        : undefined,
      ...(folder.startActionGroups ?? []).map((group) =>
        actionGroupElement(group, "wpml:startActionGroup"),
      ),
      ...(folder.extraElements ?? []),
      ...folder.waypoints.map(waylineWaypointElement),
    ]),
  );
}

function waylineWaypointElement(
  waypoint: WaylineFolder["waypoints"][number],
): XmlElement {
  return makeElement(
    "Placemark",
    compactNodes([
      pointElement(waypoint.coordinate),
      wpmlText("index", waypoint.index),
      wpmlTextIf("executeHeight", waypoint.executeHeight),
      wpmlTextIf("waypointSpeed", waypoint.waypointSpeed),
      waypoint.waypointHeadingParam
        ? headingParamElement(
            "waypointHeadingParam",
            waypoint.waypointHeadingParam,
          )
        : undefined,
      waypoint.waypointTurnParam
        ? turnParamElement(waypoint.waypointTurnParam)
        : undefined,
      wpmlTextIf("useStraightLine", waypoint.useStraightLine),
      ...(waypoint.extraElements ?? []),
      ...waypoint.actionGroups.map((g) => actionGroupElement(g)),
      waypoint.waypointGimbalHeadingParam
        ? gimbalHeadingParamElement(waypoint.waypointGimbalHeadingParam)
        : undefined,
    ]),
  );
}

function pointElement(coordinate: {
  readonly longitude: number;
  readonly latitude: number;
  readonly altitude?: number;
}): XmlElement {
  return makeElement("Point", [
    makeTextElement(
      "coordinates",
      formatCoordinate(coordinate, coordinate.altitude !== undefined),
    ),
  ]);
}

function headingParamElement(
  localTagName: "waypointHeadingParam" | "globalWaypointHeadingParam",
  param: WaypointHeadingParam,
): XmlElement {
  return makeElement(
    `wpml:${localTagName}`,
    compactNodes([
      wpmlTextIf("waypointHeadingMode", param.waypointHeadingMode),
      wpmlTextIf("waypointHeadingAngle", param.waypointHeadingAngle),
      param.waypointPoiPoint
        ? wpmlText(
            "waypointPoiPoint",
            formatLatLonAltCoordinate(param.waypointPoiPoint),
          )
        : undefined,
      wpmlTextIf(
        "waypointHeadingAngleEnable",
        param.waypointHeadingAngleEnable,
      ),
      wpmlTextIf("waypointHeadingPathMode", param.waypointHeadingPathMode),
      wpmlTextIf("waypointHeadingPoiIndex", param.waypointHeadingPoiIndex),
      ...(param.extraElements ?? []),
    ]),
  );
}

function turnParamElement(param: WaypointTurnParam): XmlElement {
  return makeElement(
    "wpml:waypointTurnParam",
    compactNodes([
      wpmlTextIf("waypointTurnMode", param.waypointTurnMode),
      wpmlTextIf("waypointTurnDampingDist", param.waypointTurnDampingDist),
      ...(param.extraElements ?? []),
    ]),
  );
}

function gimbalHeadingParamElement(
  param: WaypointGimbalHeadingParam,
): XmlElement {
  return makeElement(
    "wpml:waypointGimbalHeadingParam",
    compactNodes([
      wpmlTextIf("waypointGimbalPitchAngle", param.waypointGimbalPitchAngle),
      wpmlTextIf("waypointGimbalYawAngle", param.waypointGimbalYawAngle),
      ...(param.extraElements ?? []),
    ]),
  );
}

function actionGroupElement(
  group: ActionGroup,
  tagName = "wpml:actionGroup",
): XmlElement {
  return makeElement(
    tagName,
    compactNodes([
      wpmlTextIf("actionGroupId", group.actionGroupId),
      wpmlTextIf("actionGroupStartIndex", group.actionGroupStartIndex),
      wpmlTextIf("actionGroupEndIndex", group.actionGroupEndIndex),
      wpmlTextIf("actionGroupMode", group.actionGroupMode),
      group.actionTrigger
        ? actionTriggerElement(group.actionTrigger)
        : undefined,
      ...(group.extraElements ?? []),
      ...group.actions.map(actionElement),
    ]),
  );
}

function actionTriggerElement(trigger: ActionTrigger): XmlElement {
  return makeElement(
    "wpml:actionTrigger",
    compactNodes([
      wpmlTextIf("actionTriggerType", trigger.actionTriggerType),
      wpmlTextIf("actionTriggerParam", trigger.actionTriggerParam),
      ...(trigger.extraElements ?? []),
    ]),
  );
}

function actionElement(action: WpmzAction): XmlElement {
  return makeElement(
    "wpml:action",
    compactNodes([
      wpmlTextIf("actionId", action.actionId),
      wpmlText("actionActuatorFunc", action.actionActuatorFunc),
      makeElement("wpml:actionActuatorFuncParam", actionParamElements(action)),
      ...(action.extraElements ?? []),
    ]),
  );
}

function actionParamElements(action: WpmzAction): readonly XmlNode[] {
  if (action.paramElements && action.paramElements.length > 0)
    return action.paramElements;
  return Object.entries(action.params).map(([key, value]) =>
    wpmlText(key, value),
  );
}

function wpmlText(
  localTagName: string,
  value: string | number | boolean,
): XmlElement {
  if (typeof value === "number")
    return makeTextElement(`wpml:${localTagName}`, formatNumber(value));
  return makeTextElement(`wpml:${localTagName}`, value);
}

function wpmlTextIf(
  localTagName: string,
  value: string | number | boolean | undefined,
): XmlElement | undefined {
  return value !== undefined ? wpmlText(localTagName, value) : undefined;
}

function shouldInclude(
  policy: "always" | "when-present" | "never",
  isPresent: boolean,
): boolean {
  return policy === "always" || (policy === "when-present" && isPresent);
}

function compactNodes(nodes: readonly (XmlNode | undefined)[]): XmlNode[] {
  return nodes.filter((node): node is XmlNode => node !== undefined);
}

function synthesizeWaylineFolder(document: WpmzDocument): WaylineFolder {
  const folder = document.templateFolder;
  const waypoints = (folder?.waypoints ?? []).map((waypoint) => ({
    index: waypoint.index,
    coordinate: waypoint.coordinate,
    executeHeight:
      waypoint.height ?? waypoint.ellipsoidHeight ?? folder?.globalHeight,
    waypointSpeed: waypoint.waypointSpeed ?? folder?.autoFlightSpeed,
    waypointHeadingParam:
      waypoint.waypointHeadingParam ?? folder?.globalWaypointHeadingParam,
    waypointTurnParam:
      waypoint.waypointTurnParam ??
      (folder?.globalWaypointTurnMode
        ? {
            waypointTurnMode: folder.globalWaypointTurnMode,
            waypointTurnDampingDist: 0,
          }
        : undefined),
    useStraightLine: waypoint.useStraightLine ?? folder?.globalUseStraightLine,
    actionGroups: waypoint.actionGroups,
  }));
  return {
    templateId: folder?.templateId ?? 0,
    executeHeightMode:
      folder?.waylineCoordinateSysParam?.heightMode ?? "relativeToStartPoint",
    waylineId: 0,
    distance: 0,
    duration: 0,
    autoFlightSpeed:
      folder?.autoFlightSpeed ?? document.missionConfig.globalTransitionalSpeed,
    waylineCoordinateSysParam: folder?.waylineCoordinateSysParam,
    waypoints,
  };
}

function synthesizeTemplateFolder(
  document: WpmzDocument,
): TemplateFolder | undefined {
  const firstWayline = document.waylines[0];
  if (!firstWayline) return undefined;
  return {
    templateType: "waypoint",
    templateId: firstWayline.templateId ?? 0,
    autoFlightSpeed: firstWayline.autoFlightSpeed,
    waylineCoordinateSysParam: firstWayline.waylineCoordinateSysParam ?? {
      coordinateMode: "WGS84",
      heightMode: firstWayline.executeHeightMode,
    },
    gimbalPitchMode: "usePointSetting",
    globalWaypointTurnMode:
      firstWayline.waypoints[0]?.waypointTurnParam?.waypointTurnMode,
    globalUseStraightLine: firstWayline.waypoints[0]?.useStraightLine,
    waypoints: firstWayline.waypoints.map((waypoint) => ({
      index: waypoint.index,
      coordinate: waypoint.coordinate,
      ellipsoidHeight: waypoint.executeHeight,
      height: waypoint.executeHeight,
      useGlobalHeight: false,
      useGlobalSpeed: false,
      waypointSpeed: waypoint.waypointSpeed,
      useGlobalHeadingParam: false,
      waypointHeadingParam: waypoint.waypointHeadingParam,
      useGlobalTurnParam: false,
      waypointTurnParam: waypoint.waypointTurnParam,
      useStraightLine: waypoint.useStraightLine,
      gimbalPitchAngle:
        waypoint.waypointGimbalHeadingParam?.waypointGimbalPitchAngle,
      actionGroups: waypoint.actionGroups,
    })),
  };
}
