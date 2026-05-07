import archiver from "archiver";
import { PassThrough } from "stream";
import type { Mission } from "@droneroute/shared";
import { resolveKmzProfile } from "@droneroute/shared";
import {
  buildDjiFlyTemplateKml,
  buildDjiFlyWaylinesWpml,
  buildTemplateKml,
  buildWaylinesWpml,
} from "../lib/wpml.js";

export function generateKmzBuffer(mission: Mission): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();

    passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);

    archive.pipe(passthrough);

    if (resolveKmzProfile(mission.config) === "djiFly") {
      archive.append(buildDjiFlyTemplateKml(mission), {
        name: "wpmz/template.kml",
      });
      archive.append(buildDjiFlyWaylinesWpml(mission), {
        name: "wpmz/waylines.wpml",
      });
    } else {
      archive.append(buildTemplateKml(mission), { name: "template.kml" });
      archive.append(buildWaylinesWpml(mission), { name: "waylines.wpml" });
      archive.append("", { name: "res/" });
    }

    archive.finalize();
  });
}
