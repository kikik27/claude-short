// usage (run from remotion/): node ../scripts/stills.mjs <outPrefix> <frame,frame,...> [scale]
// Renders AiBelanjaShort stills with the Playwright chromium on Linux.
// Bundles go to ../remotion-tmp (never the system temp dir).
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const REMOTION_TMP = path.resolve("../remotion-tmp");
fs.mkdirSync(REMOTION_TMP, { recursive: true });
process.env.TEMP = process.env.TMP = REMOTION_TMP;
process.env.REMOTION_TMP = REMOTION_TMP;

const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const browserExecutable =
  process.env.CHROME_PATH ||
  path.join(process.env.HOME, ".cache/ms-playwright/chromium-1255/chrome-linux64/chrome");
const chromiumOptions = { gl: "swangle" }; // SwiftShader ANGLE: software WebGL (no GPU in this VM)
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "AiBelanjaShort", browserExecutable, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
