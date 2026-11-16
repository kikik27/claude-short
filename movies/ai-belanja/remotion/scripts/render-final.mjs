// usage (run from remotion/):
//   node scripts/render-final.mjs <output.mp4> [frames] [scale]
// Renders AiBelanjaShort as SILENT video (audio is muxed separately from audio/mix.wav,
// because Remotion writes a silent audio track). Browser = Playwright chromium
// with SwiftShader WebGL (no GPU in this VM). Bundles go to ../remotion-tmp.
// frames: "0-2204" (full) or "0-29" (speed test). scale 1.3333 = 1440x2560 (2K).
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const REMOTION_TMP = path.resolve("../remotion-tmp");
fs.mkdirSync(REMOTION_TMP, { recursive: true });
process.env.TEMP = process.env.TMP = REMOTION_TMP;
process.env.REMOTION_TMP = REMOTION_TMP;

const [output, frames = "0-2204", scale = "1.3333"] = process.argv.slice(2);
const [startFrame, endFrame] = frames.split("-").map(Number);
const browserExecutable =
  process.env.CHROME_PATH ||
  path.join(process.env.HOME, ".cache/ms-playwright/chromium-1255/chrome-linux64/chrome");
const chromiumOptions = { gl: "swangle" }; // SwiftShader ANGLE: software WebGL (no GPU in this VM)
const onBrowserLog = (l) => { if (l.type === "error") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
console.log("bundled in", ((Date.now() - t0) / 1000).toFixed(1) + "s");
const composition = await selectComposition({ serveUrl, id: "AiBelanjaShort", browserExecutable, chromiumOptions });
const { totalFrames } = await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: path.resolve(output),
  imageFormat: "jpeg",
  scale: Number(scale),
  browserExecutable,
  chromiumOptions,
  timeoutInMilliseconds: 30 * 60 * 1000,
  onBrowserLog,
  onProgress: ({ renderedFrames, encodedFrames }) => {
    const el = (Date.now() - t0) / 1000;
    const fps = renderedFrames / Math.max(el, 1);
    process.stdout.write(`\rframe ${renderedFrames}/${endFrame - startFrame + 1} encoded ${encodedFrames} elapsed ${el.toFixed(0)}s (~${fps.toFixed(2)} fps)`);
  },
  ...(startFrame || endFrame !== 2204 ? { frameRange: [startFrame, endFrame] } : {}),
});
console.log("\ndone:", output, "frames:", totalFrames, "in", ((Date.now() - t0) / 1000).toFixed(0) + "s");
