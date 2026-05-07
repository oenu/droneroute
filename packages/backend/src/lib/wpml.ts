import type {
  Mission,
  Waypoint,
  WaypointAction,
  PointOfInterest,
} from "@droneroute/shared";

const DJI_WPML_NAMESPACE = "http://www.dji.com/wpmz/1.0.2";
const DJI_FLY_WPML_NAMESPACE = "http://www.uav.com/wpmz/1.0.2";

// ── XML Helpers ──────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Compute bearing (degrees, 0=N, CW) from point A to point B */
function computeBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((toDeg(Math.atan2(y, x)) % 360) + 360) % 360;
}

function findPoi(
  pois: PointOfInterest[],
  id?: string,
): PointOfInterest | undefined {
  if (!id) return undefined;
  return pois.find((p) => p.id === id);
}

function getParam(params: any, key: string): any {
  return params?.[key] ?? params?.[`wpml:${key}`];
}

// ── Action XML ───────────────────────────────────────────

function buildActionXml(action: WaypointAction): string {
  let paramsXml = "";
  const p = action.params;

  switch (action.actionType) {
    case "takePhoto":
      paramsXml = `
              <wpml:payloadPositionIndex>${getParam(p, "payloadPositionIndex") ?? 0}</wpml:payloadPositionIndex>
              <wpml:fileSuffix>${escapeXml(getParam(p, "fileSuffix") || "")}</wpml:fileSuffix>`;
      break;
    case "startRecord":
      paramsXml = `
              <wpml:payloadPositionIndex>${getParam(p, "payloadPositionIndex") ?? 0}</wpml:payloadPositionIndex>
              <wpml:fileSuffix>${escapeXml(getParam(p, "fileSuffix") || "")}</wpml:fileSuffix>`;
      break;
    case "stopRecord":
      paramsXml = `
              <wpml:payloadPositionIndex>${getParam(p, "payloadPositionIndex") ?? 0}</wpml:payloadPositionIndex>`;
      break;
    case "gimbalRotate":
      paramsXml = `
              <wpml:gimbalHeadingYawBase>north</wpml:gimbalHeadingYawBase>
              <wpml:gimbalRotateMode>${getParam(p, "gimbalRotateMode") || "absoluteAngle"}</wpml:gimbalRotateMode>
              <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
              <wpml:gimbalPitchRotateAngle>${getParam(p, "gimbalPitchRotateAngle") ?? 0}</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
              <wpml:gimbalRollRotateAngle>${getParam(p, "gimbalRollRotateAngle") ?? 0}</wpml:gimbalRollRotateAngle>
              <wpml:gimbalYawRotateEnable>1</wpml:gimbalYawRotateEnable>
              <wpml:gimbalYawRotateAngle>${getParam(p, "gimbalYawRotateAngle") ?? 0}</wpml:gimbalYawRotateAngle>
              <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
              <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
              <wpml:payloadPositionIndex>${getParam(p, "payloadPositionIndex") ?? 0}</wpml:payloadPositionIndex>`;
      break;
    case "gimbalEvenlyRotate":
      paramsXml = `
              <wpml:gimbalPitchRotateAngle>${getParam(p, "gimbalPitchRotateAngle") ?? -45}</wpml:gimbalPitchRotateAngle>
              <wpml:payloadPositionIndex>${getParam(p, "payloadPositionIndex") ?? 0}</wpml:payloadPositionIndex>`;
      break;
    case "rotateYaw":
      paramsXml = `
              <wpml:aircraftHeading>${getParam(p, "aircraftHeading") ?? 0}</wpml:aircraftHeading>
              <wpml:aircraftPathMode>${getParam(p, "aircraftPathMode") || "clockwise"}</wpml:aircraftPathMode>`;
      break;
    case "hover":
      paramsXml = `
              <wpml:hoverTime>${getParam(p, "hoverTime") ?? 5}</wpml:hoverTime>`;
      break;
    case "zoom":
      paramsXml = `
              <wpml:focalLength>${getParam(p, "focalLength") ?? 24}</wpml:focalLength>`;
      break;
    case "focus":
      paramsXml = `
              <wpml:isPointFocus>${getParam(p, "isPointFocus") ? 1 : 0}</wpml:isPointFocus>
              <wpml:focusX>${getParam(p, "focusX") ?? 0.5}</wpml:focusX>
              <wpml:focusY>${getParam(p, "focusY") ?? 0.5}</wpml:focusY>
              <wpml:isInfiniteFocus>${getParam(p, "isInfiniteFocus") ? 1 : 0}</wpml:isInfiniteFocus>`;
      break;
  }

  return `
          <wpml:action>
            <wpml:actionId>${action.actionId}</wpml:actionId>
            <wpml:actionActuatorFunc>${action.actionType}</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>${paramsXml}
            </wpml:actionActuatorFuncParam>
          </wpml:action>`;
}

function buildActionGroupXml(wp: Waypoint, groupIdOffset: number): string {
  if (wp.actions.length === 0) return "";

  const actionsXml = wp.actions.map(buildActionXml).join("");

  return `
        <wpml:actionGroup>
          <wpml:actionGroupId>${groupIdOffset}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${wp.index}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${wp.index}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>${actionsXml}
        </wpml:actionGroup>`;
}

function buildDjiFlyActionXml(action: WaypointAction): string {
  const p = action.params;
  let paramsXml = "";

  switch (action.actionType) {
    case "takePhoto":
    case "startRecord":
      paramsXml = `
              <wpml:payloadPositionIndex>${getParam(p, "payloadPositionIndex") ?? 0}</wpml:payloadPositionIndex>
              <wpml:useGlobalPayloadLensIndex>0</wpml:useGlobalPayloadLensIndex>`;
      break;
    case "stopRecord":
      paramsXml = `
              <wpml:payloadPositionIndex>${getParam(p, "payloadPositionIndex") ?? 0}</wpml:payloadPositionIndex>`;
      break;
    case "gimbalRotate":
      paramsXml = `
              <wpml:gimbalHeadingYawBase>aircraft</wpml:gimbalHeadingYawBase>
              <wpml:gimbalRotateMode>${getParam(p, "gimbalRotateMode") || "absoluteAngle"}</wpml:gimbalRotateMode>
              <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
              <wpml:gimbalPitchRotateAngle>${getParam(p, "gimbalPitchRotateAngle") ?? 0}</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
              <wpml:gimbalRollRotateAngle>${getParam(p, "gimbalRollRotateAngle") ?? 0}</wpml:gimbalRollRotateAngle>
              <wpml:gimbalYawRotateEnable>0</wpml:gimbalYawRotateEnable>
              <wpml:gimbalYawRotateAngle>${getParam(p, "gimbalYawRotateAngle") ?? 0}</wpml:gimbalYawRotateAngle>
              <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
              <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
              <wpml:payloadPositionIndex>${getParam(p, "payloadPositionIndex") ?? 0}</wpml:payloadPositionIndex>`;
      break;
    case "gimbalEvenlyRotate":
      paramsXml = `
              <wpml:gimbalPitchRotateAngle>${getParam(p, "gimbalPitchRotateAngle") ?? -45}</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateAngle>${getParam(p, "gimbalRollRotateAngle") ?? 0}</wpml:gimbalRollRotateAngle>
              <wpml:payloadPositionIndex>${getParam(p, "payloadPositionIndex") ?? 0}</wpml:payloadPositionIndex>`;
      break;
    case "rotateYaw":
      paramsXml = `
              <wpml:aircraftHeading>${getParam(p, "aircraftHeading") ?? 0}</wpml:aircraftHeading>
              <wpml:aircraftPathMode>${getParam(p, "aircraftPathMode") || "clockwise"}</wpml:aircraftPathMode>`;
      break;
    case "hover":
      paramsXml = `
              <wpml:hoverTime>${getParam(p, "hoverTime") ?? 5}</wpml:hoverTime>`;
      break;
    case "zoom":
      paramsXml = `
              <wpml:focalLength>${getParam(p, "focalLength") ?? 0}</wpml:focalLength>
              <wpml:isUseFocalFactor>1</wpml:isUseFocalFactor>
              <wpml:focalFactor>${getParam(p, "focalFactor") ?? 1}</wpml:focalFactor>
              <wpml:payloadPositionIndex>${getParam(p, "payloadPositionIndex") ?? 0}</wpml:payloadPositionIndex>`;
      break;
    case "focus":
      paramsXml = `
              <wpml:isPointFocus>${getParam(p, "isPointFocus") ? 1 : 0}</wpml:isPointFocus>
              <wpml:focusX>${getParam(p, "focusX") ?? 0.5}</wpml:focusX>
              <wpml:focusY>${getParam(p, "focusY") ?? 0.5}</wpml:focusY>
              <wpml:isInfiniteFocus>${getParam(p, "isInfiniteFocus") ? 1 : 0}</wpml:isInfiniteFocus>`;
      break;
  }

  return `
          <wpml:action>
            <wpml:actionId>${action.actionId}</wpml:actionId>
            <wpml:actionActuatorFunc>${action.actionType}</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>${paramsXml}
            </wpml:actionActuatorFuncParam>
          </wpml:action>`;
}

function buildDjiFlyActionGroupsXml(wp: Waypoint): string {
  if (wp.actions.length === 0) return "";

  return wp.actions
    .map((action, actionIndex) => {
      const isBetweenPoints = action.actionType === "gimbalEvenlyRotate";
      const endIndex = isBetweenPoints ? wp.index + 1 : wp.index;
      const triggerType = isBetweenPoints
        ? "betweenAdjacentPoints"
        : "reachPoint";

      return `
        <wpml:actionGroup>
          <wpml:actionGroupId>${actionIndex}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${wp.index}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${endIndex}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>${triggerType}</wpml:actionTriggerType>
          </wpml:actionTrigger>${buildDjiFlyActionXml(action)}
        </wpml:actionGroup>`;
    })
    .join("");
}

// ── Template KML ─────────────────────────────────────────

export function buildTemplateKml(mission: Mission): string {
  const c = mission.config;
  const pois = mission.pois || [];
  const now = Date.now();

  const placemarks = mission.waypoints
    .map((wp, i) => {
      const actionGroupXml = buildActionGroupXml(wp, i);

      // Build per-waypoint heading param when using towardPOI
      let headingOverrideXml = "";
      if (
        !wp.useGlobalHeadingParam &&
        wp.headingMode === "towardPOI" &&
        wp.poiId
      ) {
        const poi = findPoi(pois, wp.poiId);
        if (poi) {
          headingOverrideXml = `
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>towardPOI</wpml:waypointHeadingMode>
          <wpml:waypointPoiPoint>${poi.latitude},${poi.longitude},${poi.height}</wpml:waypointPoiPoint>
          <wpml:waypointHeadingPathMode>clockwise</wpml:waypointHeadingPathMode>
        </wpml:waypointHeadingParam>`;
        }
      }

      return `
      <Placemark>
        <Point>
          <coordinates>${wp.longitude},${wp.latitude}</coordinates>
        </Point>
        <wpml:index>${wp.index}</wpml:index>
        <wpml:ellipsoidHeight>${wp.height}</wpml:ellipsoidHeight>
        <wpml:height>${wp.height}</wpml:height>
        <wpml:useGlobalHeight>${wp.useGlobalHeight ? 1 : 0}</wpml:useGlobalHeight>
        <wpml:useGlobalSpeed>${wp.useGlobalSpeed ? 1 : 0}</wpml:useGlobalSpeed>
        ${!wp.useGlobalSpeed ? `<wpml:waypointSpeed>${wp.speed}</wpml:waypointSpeed>` : ""}
        <wpml:useGlobalHeadingParam>${wp.useGlobalHeadingParam ? 1 : 0}</wpml:useGlobalHeadingParam>
        <wpml:useGlobalTurnParam>${wp.useGlobalTurnParam ? 1 : 0}</wpml:useGlobalTurnParam>
        <wpml:gimbalPitchAngle>${wp.gimbalPitchAngle}</wpml:gimbalPitchAngle>${headingOverrideXml}${actionGroupXml}
      </Placemark>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"
     xmlns:wpml="${DJI_WPML_NAMESPACE}">
<Document>
  <wpml:createTime>${now}</wpml:createTime>
  <wpml:updateTime>${now}</wpml:updateTime>
  <wpml:missionConfig>
    <wpml:flyToWaylineMode>${c.flyToWaylineMode}</wpml:flyToWaylineMode>
    <wpml:finishAction>${c.finishAction}</wpml:finishAction>
    <wpml:exitOnRCLost>${c.exitOnRCLost}</wpml:exitOnRCLost>
    <wpml:executeRCLostAction>${c.executeRCLostAction}</wpml:executeRCLostAction>
    <wpml:takeOffSecurityHeight>${c.takeOffSecurityHeight}</wpml:takeOffSecurityHeight>
    <wpml:globalTransitionalSpeed>${c.globalTransitionalSpeed}</wpml:globalTransitionalSpeed>
    <wpml:droneInfo>
      <wpml:droneEnumValue>${c.droneEnumValue}</wpml:droneEnumValue>
      <wpml:droneSubEnumValue>${c.droneSubEnumValue}</wpml:droneSubEnumValue>
    </wpml:droneInfo>
    <wpml:payloadInfo>
      <wpml:payloadEnumValue>${c.payloadEnumValue}</wpml:payloadEnumValue>
      <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
    </wpml:payloadInfo>
  </wpml:missionConfig>
  <Folder>
    <wpml:templateType>waypoint</wpml:templateType>
    <wpml:templateId>0</wpml:templateId>
    <wpml:autoFlightSpeed>${c.autoFlightSpeed}</wpml:autoFlightSpeed>
    <wpml:waylineCoordinateSysParam>
      <wpml:coordinateMode>WGS84</wpml:coordinateMode>
      <wpml:heightMode>${c.heightMode}</wpml:heightMode>
    </wpml:waylineCoordinateSysParam>
    <wpml:gimbalPitchMode>${c.gimbalPitchMode}</wpml:gimbalPitchMode>
    <wpml:globalWaypointHeadingParam>
      <wpml:waypointHeadingMode>${c.globalHeadingMode}</wpml:waypointHeadingMode>
      <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
    </wpml:globalWaypointHeadingParam>
    <wpml:globalWaypointTurnMode>${c.globalTurnMode}</wpml:globalWaypointTurnMode>${placemarks}
  </Folder>
</Document>
</kml>`;
}

// ── Waylines WPML ────────────────────────────────────────

export function buildWaylinesWpml(mission: Mission): string {
  const c = mission.config;
  const pois = mission.pois || [];
  const now = Date.now();

  const placemarks = mission.waypoints
    .map((wp, i) => {
      const actionGroupXml = buildActionGroupXml(wp, i);
      const headingMode = wp.useGlobalHeadingParam
        ? c.globalHeadingMode
        : wp.headingMode || c.globalHeadingMode;
      const turnMode = wp.useGlobalTurnParam
        ? c.globalTurnMode
        : wp.turnMode || c.globalTurnMode;
      const speed = wp.useGlobalSpeed ? c.autoFlightSpeed : wp.speed;

      // POI pointing: compute bearing or emit POI coordinates
      let poiXml = "";
      let headingAngle = wp.headingAngle ?? 0;
      if (headingMode === "towardPOI" && wp.poiId) {
        const poi = findPoi(pois, wp.poiId);
        if (poi) {
          headingAngle = computeBearing(
            wp.latitude,
            wp.longitude,
            poi.latitude,
            poi.longitude,
          );
          poiXml = `
          <wpml:waypointPoiPoint>${poi.latitude},${poi.longitude},${poi.height}</wpml:waypointPoiPoint>`;
        }
      }

      return `
      <Placemark>
        <Point>
          <coordinates>${wp.longitude},${wp.latitude}</coordinates>
        </Point>
        <wpml:index>${wp.index}</wpml:index>
        <wpml:executeHeight>${wp.height}</wpml:executeHeight>
        <wpml:waypointSpeed>${speed}</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>${headingMode}</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>${headingAngle}</wpml:waypointHeadingAngle>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>${poiXml}
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>${turnMode}</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>${wp.turnDampingDist ?? 0}</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:gimbalPitchAngle>${wp.gimbalPitchAngle}</wpml:gimbalPitchAngle>${actionGroupXml}
      </Placemark>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"
     xmlns:wpml="${DJI_WPML_NAMESPACE}">
<Document>
  <wpml:createTime>${now}</wpml:createTime>
  <wpml:updateTime>${now}</wpml:updateTime>
  <wpml:missionConfig>
    <wpml:flyToWaylineMode>${c.flyToWaylineMode}</wpml:flyToWaylineMode>
    <wpml:finishAction>${c.finishAction}</wpml:finishAction>
    <wpml:exitOnRCLost>${c.exitOnRCLost}</wpml:exitOnRCLost>
    <wpml:executeRCLostAction>${c.executeRCLostAction}</wpml:executeRCLostAction>
    <wpml:takeOffSecurityHeight>${c.takeOffSecurityHeight}</wpml:takeOffSecurityHeight>
    <wpml:globalTransitionalSpeed>${c.globalTransitionalSpeed}</wpml:globalTransitionalSpeed>
    <wpml:droneInfo>
      <wpml:droneEnumValue>${c.droneEnumValue}</wpml:droneEnumValue>
      <wpml:droneSubEnumValue>${c.droneSubEnumValue}</wpml:droneSubEnumValue>
    </wpml:droneInfo>
    <wpml:payloadInfo>
      <wpml:payloadEnumValue>${c.payloadEnumValue}</wpml:payloadEnumValue>
      <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
    </wpml:payloadInfo>
  </wpml:missionConfig>
  <Folder>
    <wpml:templateId>0</wpml:templateId>
    <wpml:waylineId>0</wpml:waylineId>
    <wpml:autoFlightSpeed>${c.autoFlightSpeed}</wpml:autoFlightSpeed>
    <wpml:waylineCoordinateSysParam>
      <wpml:coordinateMode>WGS84</wpml:coordinateMode>
      <wpml:heightMode>${c.heightMode}</wpml:heightMode>
    </wpml:waylineCoordinateSysParam>${placemarks}
  </Folder>
</Document>
</kml>`;
}

// ── DJI Fly WPML ─────────────────────────────────────────

export function buildDjiFlyTemplateKml(mission: Mission): string {
  const c = mission.config;
  const nowSeconds = (Date.now() / 1000).toFixed(4);

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${DJI_FLY_WPML_NAMESPACE}">
  <Document>
    <wpml:createTime>${nowSeconds}</wpml:createTime>
    <wpml:updateTime>${nowSeconds}</wpml:updateTime>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>${c.flyToWaylineMode}</wpml:flyToWaylineMode>
      <wpml:finishAction>${c.finishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>${c.exitOnRCLost}</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${c.executeRCLostAction}</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>${c.globalTransitionalSpeed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>${c.droneEnumValue}</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>${c.droneSubEnumValue}</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>
  </Document>
</kml>`;
}

export function buildDjiFlyWaylinesWpml(mission: Mission): string {
  const c = mission.config;
  const pois = mission.pois || [];

  const placemarks = mission.waypoints
    .map((wp) => {
      const actionGroupXml = buildDjiFlyActionGroupsXml(wp);
      const headingMode = wp.useGlobalHeadingParam
        ? c.globalHeadingMode
        : wp.headingMode || c.globalHeadingMode;
      const turnMode = wp.useGlobalTurnParam
        ? c.globalTurnMode
        : wp.turnMode || c.globalTurnMode;
      const speed = wp.useGlobalSpeed ? c.autoFlightSpeed : wp.speed;

      let headingAngle = wp.headingAngle ?? 0;
      let poiPoint = "0.000000,0.000000,0.000000";
      if (headingMode === "towardPOI" && wp.poiId) {
        const poi = findPoi(pois, wp.poiId);
        if (poi) {
          headingAngle = computeBearing(
            wp.latitude,
            wp.longitude,
            poi.latitude,
            poi.longitude,
          );
          poiPoint = `${poi.latitude},${poi.longitude},${poi.height.toFixed(6)}`;
        }
      }

      return `
      <Placemark>
        <Point>
          <coordinates>
            ${wp.longitude},${wp.latitude}
          </coordinates>
        </Point>
        <wpml:index>${wp.index}</wpml:index>
        <wpml:executeHeight>${wp.height}</wpml:executeHeight>
        <wpml:waypointSpeed>${speed}</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>${headingMode}</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>${headingAngle}</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>${poiPoint}</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>${headingMode === "manually" ? 0 : 1}</wpml:waypointHeadingAngleEnable>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
          <wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>${turnMode}</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>${wp.turnDampingDist ?? 0}</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>0</wpml:useStraightLine>${actionGroupXml}
        <wpml:waypointGimbalHeadingParam>
          <wpml:waypointGimbalPitchAngle>${wp.gimbalPitchAngle}</wpml:waypointGimbalPitchAngle>
          <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
        </wpml:waypointGimbalHeadingParam>
      </Placemark>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${DJI_FLY_WPML_NAMESPACE}">
  <Document>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>${c.flyToWaylineMode}</wpml:flyToWaylineMode>
      <wpml:finishAction>${c.finishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>${c.exitOnRCLost}</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${c.executeRCLostAction}</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>${c.globalTransitionalSpeed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>${c.droneEnumValue}</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>${c.droneSubEnumValue}</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateId>0</wpml:templateId>
      <wpml:executeHeightMode>${c.heightMode}</wpml:executeHeightMode>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:distance>0</wpml:distance>
      <wpml:duration>0</wpml:duration>
      <wpml:autoFlightSpeed>${c.autoFlightSpeed}</wpml:autoFlightSpeed>${placemarks}
    </Folder>
  </Document>
</kml>`;
}
