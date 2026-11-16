// Our cast as lit flat sprites in the 3D world. Same machinery as the bridge template
// (Pool / Actor / Fx, NOINK layer, cardShade), but OUR OWN characters and staging:
// Zaky (young man, blue tee), Dots (a friendly round robot-agent with three dots for
// a face), and drawn props: phone, wallet, rice-cooker cards, fingerprint, finger,
// waiting clock. No captions or text anywhere — the story is told by the pictures.
import * as THREE from "three";
import {
  Pen, bodyFront, fxBurst, fxStars, fxRing, fxShadow, fxContact,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, SHOTS, V3, smooth, clamp01, easeOut,
  DOTS_POP, WALLET_T, COMPARE_T, PICK_T, TAP_T, TOKEN_T, WAIT_T, CTA_T,
  dotsBob, cardBob, pickU, tapU, tokenU, clockU,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { drawChatGPTLogo } from "./logos";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const ROOTS = new Set<THREE.Object3D>();

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks ----------------
const LEAD = 2 / FPS;
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => bodyFront(p, who.o, f2),
    size: [w, h, k],
  };
};

const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- our characters ----------------
export const ZAKY: Outfit = { jacket: "#2563eb", pants: "#1f2937", boots: "#f4f1ea", hat: "hair", hair: "#1a1512", belt: "#d9dde0" };
export const NEIGHBOUR: Outfit = { jacket: "#e2453c", pants: "#3b5b9a", boots: "#5a3b2a", hat: "hair", hair: "#3a2a1a" };

// Dots: a friendly round robot-agent. Drawn in the 600x1000 design space; the body
// sits in the middle of the canvas (the Actor's soles are at the canvas bottom, so
// the robot floats: its hover blob is placed separately at floor/platform level).
// tilt = lean in radians (drawn as a Pen rotation about the body centre).
// Cute original robot-agent "Dots"
export const dotsBot = (p: Pen, tilt = 0, blink = 0) => {
  p.rot = tilt ? [tilt, 300, 480] : null;
  // antenna
  p.line([[300, 300], [300, 210]], "#3b82f6", 14);
  p.ell(300, 195, 26, 26, "#fbbf24", 8);
  // body: round, sky-blue with a darker belly shade
  p.ell(300, 480, 195, 185, "#93c5fd", 12);
  p.ell(300, 560, 150, 100, "#60a5fa", 0);
  // face screen: dark rounded panel with three dots
  p.poly([[170, 400], [430, 400], [430, 540], [170, 540]], "#1e293b", 10);
  const dy = blink ? -8 : 0;
  for (const dx of [-62, 0, 62]) p.dot(300 + dx, 470 + dy, blink ? 10 : 20, "#f8fafc");
  // little arms
  p.line([[120, 500], [70, 560]], "#3b82f6", 16);
  p.line([[480, 500], [530, 560]], "#3b82f6", 16);
  p.rot = null;
};

// ---------------- drawn props (Fx cards) ----------------
/** authentic wire supermarket shopping cart with wheels and red handle */
export const shoppingCart = (p: Pen) => {
  const g = p.g;
  // 1. Lower chassis frame & 4 wheels
  p.line([[100, 340], [280, 340]], "#64748b", 8, false); // base rail
  p.line([[100, 340], [130, 290]], "#64748b", 8, false); // front diagonal
  p.line([[280, 340], [290, 280]], "#64748b", 8, false); // rear vertical

  // Wheels
  p.ell(115, 360, 16, 16, "#334155", 6);
  p.dot(115, 360, 6, "#cbd5e1");
  p.ell(265, 360, 16, 16, "#334155", 6);
  p.dot(265, 360, 6, "#cbd5e1");

  // Lower wire tray
  p.line([[130, 320], [260, 320]], "#94a3b8", 4, false);

  // 2. Wire mesh basket
  p.poly([
    [90, 180], [300, 160], [280, 290], [120, 290]
  ], "rgba(226, 232, 240, 0.25)", 10);

  // Chrome wire grid lines (vertical)
  for (let x = 110; x <= 280; x += 22) {
    p.line([[x, 175], [x - 5, 290]], "#cbd5e1", 3, false);
  }
  // Chrome wire grid lines (horizontal)
  for (let y = 195; y <= 280; y += 22) {
    const wLeft = 90 + (120 - 90) * ((y - 180) / 110);
    const wRight = 300 - (300 - 280) * ((y - 160) / 130);
    p.line([[wLeft, y], [wRight, y]], "#cbd5e1", 3, false);
  }

  // Top chrome basket rim
  p.line([[90, 180], [300, 160]], "#94a3b8", 8, false);
  p.line([[300, 160], [280, 290]], "#94a3b8", 8, false);
  p.line([[280, 290], [120, 290]], "#94a3b8", 8, false);
  p.line([[120, 290], [90, 180]], "#94a3b8", 8, false);

  // 3. Push handle (angled back, red plastic grip)
  p.line([[300, 160], [340, 120]], "#64748b", 8, false);
  p.line([[330, 125], [355, 110]], "#ef4444", 16, true);
};

/** smartphone displaying Tokopedia shopping app */
export const phoneCard = (p: Pen, glow = "#bfdbfe") => {
  const g = p.g;
  // Outer phone chassis (dark slate)
  p.poly([[50, 10], [350, 10], [350, 590], [50, 590]], "#0f172a", 12);
  // Phone screen (white / light background like real app)
  p.poly([[65, 25], [335, 25], [335, 575], [65, 575]], "#f8fafc", 0);

  // Top Dynamic Island / speaker
  p.poly([[165, 32], [235, 32], [235, 46], [165, 46]], "#000000", 3);

  // 1. Tokopedia Green Header Bar (#03ac0e)
  g.save();
  g.fillStyle = "#03ac0e";
  g.fillRect(65, 52, 270, 75);

  // Search Bar inside Header (White rounded pill)
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(80, 68, 240, 42, 20);
  g.fill();

  // Search Icon & Typed Prompt: "carikan magicom 500k"
  g.fillStyle = "#64748b";
  g.font = "14px sans-serif";
  g.fillText("🔍", 92, 94);

  g.fillStyle = "#0f172a";
  g.font = "bold 13px 'Segoe UI', sans-serif";
  g.fillText("carikan magicom 500k", 116, 94);

  // Cursor
  g.fillStyle = "#03ac0e";
  g.fillRect(265, 80, 2, 18);
  g.restore();

  // 2. Filter Pills under header
  g.save();
  g.fillStyle = "#e8f5e9";
  g.beginPath(); g.roundRect(80, 136, 75, 26, 12); g.fill();
  g.strokeStyle = "#03ac0e"; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = "#03ac0e"; g.font = "bold 12px sans-serif"; g.fillText("Terkait ✓", 90, 153);

  g.fillStyle = "#f1f5f9";
  g.beginPath(); g.roundRect(165, 136, 75, 26, 12); g.fill();
  g.fillStyle = "#64748b"; g.font = "12px sans-serif"; g.fillText("Terlaris", 182, 153);

  g.fillStyle = "#f1f5f9";
  g.beginPath(); g.roundRect(250, 136, 65, 26, 12); g.fill();
  g.fillStyle = "#64748b"; g.font = "12px sans-serif"; g.fillText("Filter", 268, 153);
  g.restore();

  // 3. Tokopedia Product Card
  g.save();
  g.fillStyle = "#ffffff";
  g.beginPath(); g.roundRect(80, 175, 240, 280, 16); g.fill();
  g.strokeStyle = "#e2e8f0"; g.lineWidth = 2; g.stroke();

  // Product Image Area
  g.fillStyle = "#f8fafc";
  g.fillRect(82, 177, 236, 130);
  g.restore();

  // Draw miniature magicom inside thumbnail
  p.poly([[160, 230], [240, 230], [235, 285], [165, 285]], "#e2e8f0", 6);
  p.poly([[175, 215], [225, 215], [230, 230], [170, 230]], "#334155", 4);
  p.dot(200, 255, 6, "#10a37f");

  // Official Store Badge
  g.save();
  g.fillStyle = "#03ac0e";
  g.beginPath(); g.roundRect(90, 316, 95, 20, 6); g.fill();
  g.fillStyle = "#ffffff";
  g.font = "bold 10px sans-serif";
  g.fillText("Official Store", 100, 330);

  // Product Title
  g.fillStyle = "#1e293b";
  g.font = "bold 13px 'Segoe UI', sans-serif";
  g.fillText("Philips Magicom Digital 1.8L", 90, 355);

  // Price
  g.fillStyle = "#0f172a";
  g.font = "900 18px 'Segoe UI', sans-serif";
  g.fillText("Rp 499.000", 90, 380);

  // Cashback & Location
  g.fillStyle = "#dcfce7";
  g.beginPath(); g.roundRect(90, 392, 85, 18, 4); g.fill();
  g.fillStyle = "#15803d";
  g.font = "bold 10px sans-serif";
  g.fillText("Cashback 5%", 96, 405);

  g.fillStyle = "#64748b";
  g.font = "11px sans-serif";
  g.fillText("Jakarta Selatan • ⭐ 4.9 (1.2rb)", 90, 428);

  // Tokopedia Green "+ Keranjang" Button
  g.fillStyle = "#03ac0e";
  g.beginPath(); g.roundRect(90, 442, 220, 36, 10); g.fill();
  g.fillStyle = "#ffffff";
  g.font = "bold 14px sans-serif";
  g.textAlign = "center";
  g.fillText("+ Keranjang", 200, 465);
  g.restore();

  // 4. Tokopedia Bottom Navigation Bar
  g.save();
  g.fillStyle = "#ffffff";
  g.fillRect(65, 515, 270, 60);
  g.strokeStyle = "#e2e8f0";
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(65, 515); g.lineTo(335, 515); g.stroke();

  g.fillStyle = "#64748b";
  g.font = "18px sans-serif";
  g.textAlign = "center";
  g.fillText("🏠", 95, 542);
  g.fillText("📄", 145, 542);
  g.fillText("🛒", 200, 542);
  g.fillText("🔔", 255, 542);
  g.fillText("👤", 305, 542);

  // Active green badge on Cart
  g.fillStyle = "#03ac0e";
  g.beginPath(); g.arc(210, 532, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff";
  g.font = "bold 9px sans-serif";
  g.fillText("1", 210, 535);
  g.restore();
};

/** ChatGPT Wallet with credit cards fanned out */
export const walletCard = (p: Pen) => {
  const g = p.g;
  // 1. Backing Cards (Fanned out)
  p.poly([[110, 130], [310, 130], [310, 250], [110, 250]], "#1e3a8a", 8);
  // Card 1 (ChatGPT Wallet Card: Emerald & Gold)
  p.poly([[85, 175], [325, 175], [325, 310], [85, 310]], "#064e3b", 8);
  // Gold EMV Chip
  p.poly([[110, 215], [145, 215], [145, 245], [110, 245]], "#fbbf24", 4);
  // Contactless waves
  p.arc(170, 230, 12, 12, 310, 410, 4, "#a7f3d0");
  p.arc(170, 230, 20, 20, 310, 410, 4, "#a7f3d0");

  // ChatGPT Logo on Card
  drawChatGPTLogo(g, 290, 230, 26, "#ffffff");

  // 2. Premium Leather Wallet Pouch (Dark slate with green edge stitching)
  p.poly([[60, 240], [340, 240], [340, 470], [60, 470]], "#0f172a", 10);
  p.poly([[65, 245], [335, 245], [335, 290], [65, 290]], "#1e293b", 6);

  // Stamped "ChatGPT Wallet"
  g.save();
  g.fillStyle = "#ffffff";
  g.font = "bold 20px 'Segoe UI', sans-serif";
  g.textAlign = "center";
  g.fillText("ChatGPT Wallet", 200, 345);
  g.restore();

  // OpenAI Badge Emblem on Clasp
  p.ell(200, 400, 35, 35, "#10a37f", 6);
  drawChatGPTLogo(g, 200, 400, 20, "#ffffff");
};

/** modern digital smart rice cooker */
export const riceCooker = (p: Pen, col: string) => {
  const g = p.g;
  // 1. Steam curls rising from top vent
  p.arc(180, 100, 30, 45, 190, 350, 8, "#cbd5e1");
  p.arc(220, 80, 36, 50, 190, 350, 8, "#cbd5e1");

  // 2. Outer Capsule Body
  // Bottom non-slip rubber feet
  p.poly([[120, 380], [150, 380], [145, 395], [125, 395]], "#0f172a", 6);
  p.poly([[250, 380], [280, 380], [275, 395], [255, 395]], "#0f172a", 6);

  // Main rounded body
  p.poly([
    [90, 190], [100, 160], [140, 145], [260, 145], [300, 160], [310, 190],
    [310, 340], [290, 375], [110, 375], [90, 340]
  ], col, 10);

  // Top metallic lid with release rim
  p.poly([[120, 155], [280, 155], [265, 125], [135, 125]], "#e2e8f0", 8);
  // Chrome steam vent
  p.poly([[180, 122], [220, 122], [215, 112], [185, 112]], "#475569", 4);

  // 3. Front Control Panel (Modern Digital Fuzzy Logic Screen)
  p.poly([[130, 205], [270, 205], [270, 290], [130, 290]], "#0f172a", 8);
  // Digital LED Display
  p.poly([[155, 215], [245, 215], [245, 250], [155, 250]], "#1e293b", 0);

  g.save();
  g.fillStyle = "#fbbf24";
  g.font = "bold 22px monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("45:00", 200, 233);
  g.restore();

  // Control Buttons
  p.dot(150, 272, 8, "#10a37f"); // Cook LED
  p.dot(180, 272, 8, "#fbbf24"); // Warm LED
  p.dot(220, 272, 8, "#94a3b8");
  p.dot(250, 272, 8, "#94a3b8");

  // Big Front Push / Latch Button
  p.poly([[160, 310], [240, 310], [235, 335], [165, 335]], "#e2e8f0", 6);
};

/** high-tech biometric fingerprint with scanning laser line */
export const fingerprint = (p: Pen, scanY = 0.5) => {
  const g = p.g;
  const cx = 200, cy = 200;
  // Biometric rounded shield border
  p.ell(cx, cy, 140, 170, "rgba(15, 23, 42, 0.85)", 8);

  // Neon cyan/emerald biometric ridges
  for (let r = 24; r <= 110; r += 20) {
    p.arc(cx, cy + 10, r, r * 1.25, 190, 350, 7, "#06b6d4");
    p.arc(cx, cy + 10, r, r * 1.25, 20, 160, 7, "#06b6d4");
  }

  // Scanning laser beam moving across
  const ly = cy - 120 + scanY * 240;
  p.line([[cx - 120, ly], [cx + 120, ly]], "#10a37f", 8);
  g.save();
  g.fillStyle = "rgba(16, 163, 127, 0.25)";
  g.fillRect(cx - 120, ly - 15, 240, 30);
  g.restore();
};

/** Apple-style Face ID biometric interface */
export const faceIdCard = (p: Pen) => {
  const g = p.g;
  const cx = 200, cy = 200;
  // Rounded background
  p.ell(cx, cy, 150, 150, "rgba(15, 23, 42, 0.9)", 8);

  // 4 Corner brackets [ ]
  const b = 90, l = 28;
  // Top-left
  p.line([[cx - b, cy - b + l], [cx - b, cy - b], [cx - b + l, cy - b]], "#10a37f", 8);
  // Top-right
  p.line([[cx + b - l, cy - b], [cx + b, cy - b], [cx + b, cy - b + l]], "#10a37f", 8);
  // Bottom-left
  p.line([[cx - b, cy + b - l], [cx - b, cy + b], [cx - b + l, cy + b]], "#10a37f", 8);
  // Bottom-right
  p.line([[cx + b - l, cy + b], [cx + b, cy + b], [cx + b, cy + b - l]], "#10a37f", 8);

  // Face contour
  p.ell(cx, cy, 55, 75, null, 6);
  // Eyes
  p.dot(cx - 22, cy - 15, 6, "#10a37f");
  p.dot(cx + 22, cy - 15, 6, "#10a37f");
  // Smile contour
  p.arc(cx, cy + 20, 24, 18, 20, 160, 6, "#10a37f");

  // Text label: "Face ID"
  g.save();
  g.fillStyle = "#ffffff";
  g.font = "bold 18px sans-serif";
  g.textAlign = "center";
  g.fillText("Face ID", cx, cy + 115);
  g.restore();
};

/** a natural thumb pressing UPWARDS from the bottom edge of the phone (smartphone grip) */
export const thumbUp = (p: Pen) => {
  // Thumb shaft entering upwards from bottom of canvas
  p.poly([[155, 380], [245, 380], [235, 160], [165, 160]], "#ffe2c2", 12);
  // Rounded fingertip pad at top
  p.ell(200, 150, 42, 38, "#ffe2c2", 12);
  // Fingernail on the tip
  p.ell(200, 162, 26, 16, "#f5c9a0", 3);
  // Knuckle crease lines
  p.arc(200, 240, 24, 10, 190, 350, 3, "#e2a97b");
  p.arc(200, 268, 28, 12, 190, 350, 3, "#e2a97b");
};

/** authentic Tokopedia mobile app with voice prompt & product search results */
export const phoneVoiceCard = (p: Pen, t: number) => {
  const g = p.g;
  // Outer phone chassis (dark slate with soft bevel)
  p.poly([[50, 10], [350, 10], [350, 590], [50, 590]], "#0f172a", 12);
  // Phone screen (white / light background like real app)
  p.poly([[65, 25], [335, 25], [335, 575], [65, 575]], "#f8fafc", 0);

  // Top Dynamic Island / speaker
  p.poly([[165, 32], [235, 32], [235, 46], [165, 46]], "#000000", 3);

  // Status Bar
  g.save();
  g.fillStyle = "#0f172a";
  g.font = "bold 11px sans-serif";
  g.fillText("09:41", 80, 48);
  g.textAlign = "right";
  g.fillText("5G 100%", 320, 48);
  g.restore();

  // 1. Tokopedia Green Header Bar (#03ac0e)
  g.save();
  g.fillStyle = "#03ac0e";
  g.fillRect(65, 54, 270, 78);

  // Search Bar inside Header (White rounded pill)
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(78, 66, 244, 40, 20);
  g.fill();
  g.strokeStyle = "#e2e8f0";
  g.lineWidth = 1;
  g.stroke();

  // Search Icon & Typed Prompt: "carikan magicom 500k"
  g.fillStyle = "#64748b";
  g.font = "14px sans-serif";
  g.fillText("🔍", 90, 91);

  g.fillStyle = "#0f172a";
  g.font = "bold 12px 'Segoe UI', sans-serif";
  g.fillText("carikan magicom 500k", 112, 91);

  // Mic Icon in search bar
  g.fillStyle = "#03ac0e";
  g.font = "14px sans-serif";
  g.fillText("🎙️", 294, 91);

  // Animated voice wave line inside Tokopedia header
  for (let i = 0; i < 22; i++) {
    const wx = 88 + i * 10;
    const wh = 4 + 10 * Math.abs(Math.sin(t * 10 + i * 0.4));
    g.fillStyle = "#a7f3d0";
    g.fillRect(wx, 120 - wh / 2, 4, wh);
  }
  g.restore();

  // 2. Filter Pills under header
  g.save();
  g.fillStyle = "#e8f5e9";
  g.beginPath(); g.roundRect(78, 140, 75, 24, 12); g.fill();
  g.strokeStyle = "#03ac0e"; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = "#03ac0e"; g.font = "bold 11px sans-serif"; g.fillText("Terkait ✓", 88, 156);

  g.fillStyle = "#f1f5f9";
  g.beginPath(); g.roundRect(160, 140, 75, 24, 12); g.fill();
  g.fillStyle = "#64748b"; g.font = "11px sans-serif"; g.fillText("Terlaris", 176, 156);

  g.fillStyle = "#f1f5f9";
  g.beginPath(); g.roundRect(242, 140, 65, 24, 12); g.fill();
  g.fillStyle = "#64748b"; g.font = "11px sans-serif"; g.fillText("Filter", 260, 156);
  g.restore();

  // 3. Tokopedia Product Card
  g.save();
  g.fillStyle = "#ffffff";
  g.beginPath(); g.roundRect(78, 172, 244, 275, 14); g.fill();
  g.strokeStyle = "#e2e8f0"; g.lineWidth = 1.5; g.stroke();

  // Product Image Area
  g.fillStyle = "#f8fafc";
  g.fillRect(80, 174, 240, 125);
  g.restore();

  // Draw miniature magicom inside thumbnail
  p.poly([[160, 225], [240, 225], [235, 275], [165, 275]], "#e2e8f0", 6);
  p.poly([[175, 212], [225, 212], [230, 225], [170, 225]], "#334155", 4);
  p.dot(200, 250, 5, "#10a37f");

  // Official Store Badge
  g.save();
  g.fillStyle = "#03ac0e";
  g.beginPath(); g.roundRect(88, 308, 92, 18, 5); g.fill();
  g.fillStyle = "#ffffff";
  g.font = "bold 10px sans-serif";
  g.fillText("Official Store ✓", 95, 321);

  // Product Title
  g.fillStyle = "#1e293b";
  g.font = "bold 13px 'Segoe UI', sans-serif";
  g.fillText("Philips Magicom Digital 1.8L", 88, 344);

  // Price
  g.fillStyle = "#0f172a";
  g.font = "900 18px 'Segoe UI', sans-serif";
  g.fillText("Rp 499.000", 88, 368);

  // Cashback & Location
  g.fillStyle = "#dcfce7";
  g.beginPath(); g.roundRect(88, 378, 85, 18, 4); g.fill();
  g.fillStyle = "#15803d";
  g.font = "bold 10px sans-serif";
  g.fillText("Cashback 5%", 94, 391);

  g.fillStyle = "#64748b";
  g.font = "11px sans-serif";
  g.fillText("Jakarta Selatan • ⭐ 4.9 (1.2rb terjual)", 88, 412);

  // Tokopedia Green "+ Keranjang" Button
  g.fillStyle = "#03ac0e";
  g.beginPath(); g.roundRect(88, 424, 224, 34, 8); g.fill();
  g.fillStyle = "#ffffff";
  g.font = "bold 13px sans-serif";
  g.textAlign = "center";
  g.fillText("+ Keranjang", 200, 446);
  g.restore();

  // Voice Command Floating Pill over bottom:
  g.save();
  g.fillStyle = "rgba(15, 23, 42, 0.90)";
  g.beginPath(); g.roundRect(78, 465, 244, 40, 20); g.fill();
  g.strokeStyle = "#03ac0e"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#ffffff";
  g.font = "bold 11px sans-serif";
  g.textAlign = "center";
  g.fillText("🗣️ \"cariin rice cooker bagus budget 500k\"", 200, 489);
  g.restore();

  // 4. Tokopedia Bottom Navigation Bar
  g.save();
  g.fillStyle = "#ffffff";
  g.fillRect(65, 515, 270, 60);
  g.strokeStyle = "#e2e8f0";
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(65, 515); g.lineTo(335, 515); g.stroke();

  g.fillStyle = "#64748b";
  g.font = "18px sans-serif";
  g.textAlign = "center";
  g.fillText("🏠", 95, 542);
  g.fillText("📄", 145, 542);
  g.fillText("🛒", 200, 542);
  g.fillText("🔔", 255, 542);
  g.fillText("👤", 305, 542);

  // Active green badge on Cart
  g.fillStyle = "#03ac0e";
  g.beginPath(); g.arc(210, 532, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff";
  g.font = "bold 9px sans-serif";
  g.fillText("1", 210, 535);
  g.restore();
};

/** thinking / comparison badge displayed during AI inspection - Crisp White Comic Card */
export const scanBadge = (p: Pen, label: string, status: string, color: string) => {
  const g = p.g;
  g.save();
  // Clean white card with comic ink outline
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(15, 15, 370, 130, 18);
  g.fill();
  g.strokeStyle = "#1e293b";
  g.lineWidth = 3.5;
  g.stroke();

  // Top label
  g.fillStyle = "#475569";
  g.font = "bold 17px 'Segoe UI', sans-serif";
  g.fillText(label, 32, 52);

  // Status stamp pill
  const isRed = color.includes("ef") || color.includes("dc");
  g.fillStyle = isRed ? "#fee2e2" : "#dcfce7";
  g.beginPath();
  g.roundRect(30, 68, 340, 56, 12);
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = 2.5;
  g.stroke();

  g.fillStyle = color;
  g.font = "900 22px 'Segoe UI', sans-serif";
  g.fillText(status, 44, 104);
  g.restore();
};

/** scanning laser beam projected down from Dots */
export const scanBeam = (p: Pen, color: string) => {
  const g = p.g;
  g.save();
  const grad = g.createLinearGradient(100, 0, 100, 400);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(70, 0);
  g.lineTo(130, 0);
  g.lineTo(180, 400);
  g.lineTo(20, 400);
  g.closePath();
  g.fill();
  g.restore();
};

/** clean, proportional checkout approval screen for Shot 5 */
export const approvalPhoneCard = (p: Pen, press: number, t: number) => {
  const g = p.g;
  p.poly([[50, 10], [350, 10], [350, 590], [50, 590]], "#0f172a", 12);
  p.poly([[65, 25], [335, 25], [335, 575], [65, 575]], "#f8fafc", 0);
  p.poly([[165, 32], [235, 32], [235, 46], [165, 46]], "#000000", 3);

  g.save();
  g.fillStyle = "#0f172a";
  g.font = "bold 12px sans-serif";
  g.fillText("09:41", 80, 52);
  g.textAlign = "right";
  g.fillText("5G  100%", 320, 52);
  g.restore();

  g.save();
  g.fillStyle = "#0f172a";
  g.font = "900 16px 'Segoe UI', sans-serif";
  g.textAlign = "center";
  g.fillText("Konfirmasi Pembayaran AI", 200, 82);
  g.restore();

  // Order Details Box
  g.save();
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(80, 100, 240, 155, 14);
  g.fill();
  g.strokeStyle = "#e2e8f0";
  g.lineWidth = 1.5;
  g.stroke();

  // Store Badge
  g.fillStyle = "#03ac0e";
  g.beginPath();
  g.roundRect(90, 112, 85, 18, 4);
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = "bold 9px sans-serif";
  g.fillText("Official Store ✓", 95, 125);

  g.fillStyle = "#0f172a";
  g.font = "bold 13px 'Segoe UI', sans-serif";
  g.fillText("Philips Rice Cooker 1.8L", 90, 148);

  g.fillStyle = "#64748b";
  g.font = "12px sans-serif";
  g.fillText("Harga:", 90, 172);
  g.fillStyle = "#0f172a";
  g.font = "bold 13px sans-serif";
  g.textAlign = "right";
  g.fillText("Rp 499.000", 310, 172);

  g.textAlign = "left";
  g.fillStyle = "#64748b";
  g.fillText("Ongkos Kirim:", 90, 192);
  g.fillStyle = "#10b981";
  g.font = "bold 12px sans-serif";
  g.textAlign = "right";
  g.fillText("Bebas Ongkir", 310, 192);

  g.strokeStyle = "#e2e8f0";
  g.beginPath();
  g.moveTo(90, 206);
  g.lineTo(310, 206);
  g.stroke();

  g.textAlign = "left";
  g.fillStyle = "#0f172a";
  g.font = "900 14px sans-serif";
  g.fillText("Total Tagihan:", 90, 230);
  g.textAlign = "right";
  g.fillStyle = "#0f172a";
  g.font = "900 16px sans-serif";
  g.fillText("Rp 499.000", 310, 230);
  g.restore();

  // Payment Method Pill
  g.save();
  g.fillStyle = "#f1f5f9";
  g.beginPath();
  g.roundRect(80, 268, 240, 36, 10);
  g.fill();
  g.fillStyle = "#10a37f";
  g.font = "16px sans-serif";
  g.fillText("🛡️", 92, 292);
  g.fillStyle = "#0f172a";
  g.font = "bold 12px sans-serif";
  g.fillText("ChatGPT Wallet (•••• 4242)", 116, 291);
  g.restore();

  // Face ID Verified Pill
  g.save();
  g.fillStyle = "#ecfdf5";
  g.beginPath();
  g.roundRect(80, 314, 240, 32, 16);
  g.fill();
  g.strokeStyle = "#10b981";
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = "#065f46";
  g.font = "bold 12px sans-serif";
  g.textAlign = "center";
  g.fillText("✓ Face ID Terverifikasi: Zaky", 200, 335);
  g.restore();

  // Compact Biometric Fingerprint Button (PROPORTIONAL, not covering the phone!)
  const cx = 200, cy = 415;
  const isApproved = press > 0.6;
  g.save();
  g.fillStyle = isApproved ? "#10b981" : "rgba(15, 23, 42, 0.95)";
  g.beginPath();
  g.arc(cx, cy, 36, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = isApproved ? "#34d399" : "#0284c7";
  g.lineWidth = 3;
  g.stroke();

  if (isApproved) {
    g.strokeStyle = "#ffffff";
    g.lineWidth = 5;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(cx - 14, cy);
    g.lineTo(cx - 4, cy + 11);
    g.lineTo(cx + 15, cy - 9);
    g.stroke();
  } else {
    for (let r = 8; r <= 22; r += 7) {
      g.strokeStyle = "#38bdf8";
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(cx, cy, r, -Math.PI * 0.8, Math.PI * 0.8);
      g.stroke();
    }
  }

  g.fillStyle = isApproved ? "#10b981" : "#0f172a";
  g.font = "900 13px 'Segoe UI', sans-serif";
  g.textAlign = "center";
  g.fillText(isApproved ? "✓ TRANSAKSI DISETUJUI" : "Sentuh untuk Setuju", cx, 475);
  g.restore();
};

/** real physical credit card held by Zaky in Shot 6 */
export const realCreditCard = (p: Pen) => {
  const g = p.g;
  g.save();
  g.fillStyle = "#1d4ed8"; // Classic vibrant bank card blue
  g.beginPath();
  g.roundRect(10, 10, 380, 230, 16);
  g.fill();
  g.strokeStyle = "#1e293b";
  g.lineWidth = 3;
  g.stroke();

  // Gold EMV Chip
  g.fillStyle = "#eab308";
  g.beginPath();
  g.roundRect(40, 55, 52, 40, 6);
  g.fill();
  g.strokeStyle = "#ca8a04";
  g.lineWidth = 1.5;
  g.stroke();

  // Contactless NFC icon
  g.strokeStyle = "#ffffff";
  g.lineWidth = 2;
  for (let r = 10; r <= 20; r += 5) {
    g.beginPath();
    g.arc(120, 75, r, -Math.PI * 0.3, Math.PI * 0.3);
    g.stroke();
  }

  // Card Number
  g.fillStyle = "#ffffff";
  g.font = "bold 20px monospace";
  g.fillText("4242  ••••  ••••  8914", 40, 140);

  // Cardholder & Expiry
  g.font = "11px sans-serif";
  g.fillStyle = "#94a3b8";
  g.fillText("CARDHOLDER", 40, 175);
  g.fillText("EXPIRES", 180, 175);

  g.fillStyle = "#ffffff";
  g.font = "bold 14px sans-serif";
  g.fillText("ZAKY", 40, 198);
  g.fillText("11/29", 180, 198);

  // Mastercard circles
  g.fillStyle = "#ef4444";
  g.beginPath();
  g.arc(320, 188, 18, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(245, 158, 11, 0.85)";
  g.beginPath();
  g.arc(344, 188, 18, 0, Math.PI * 2);
  g.fill();
  g.restore();
};
/** a waiting clock: face + hands, ticks only, no numbers */
export const clockFace = (p: Pen, t: number) => {
  p.ell(200, 200, 150, 150, "#f7f1e1", 12);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    p.line([[200 + 118 * Math.cos(a), 200 + 118 * Math.sin(a)], [200 + 136 * Math.cos(a), 200 + 136 * Math.sin(a)]], "#221f2e", 8, false);
  }
  const ha = -Math.PI / 2 + ((t * 0.5) % 12) * (Math.PI / 6);
  const ma = -Math.PI / 2 + ((t * 6) % 60) * (Math.PI / 30);
  p.line([[200, 200], [200 + 70 * Math.cos(ha), 200 + 70 * Math.sin(ha)]], "#221f2e", 12, false);
  p.line([[200, 200], [200 + 105 * Math.cos(ma), 200 + 105 * Math.sin(ma)]], "#221f2e", 9, false);
  p.dot(200, 200, 12);
};

/** waving Indonesian flag on a flagpole */
export const indonesiaFlag = (p: Pen, phase = 0) => {
  const g = p.g;
  // 1. Flagpole on left
  p.line([[55, 25], [55, 385]], "#94a3b8", 8, false); // silver metallic pole
  p.line([[54, 25], [54, 385]], "#cbd5e1", 3, false); // pole specular highlight
  p.dot(55, 22, 11, "#f59e0b"); // gold top ornament
  p.dot(53, 20, 4, "#fef08a"); // ornament specular shine

  // Gold grommets connecting flag to pole
  p.dot(55, 55, 5, "#d97706");
  p.dot(55, 205, 5, "#d97706");

  const startX = 58;
  const width = 270;
  const height = 150;
  const topY = 55;
  const midY = topY + height / 2;
  const botY = topY + height;

  const steps = 36;
  const dx = width / steps;

  // Realistic double-harmonic fluttering wave: fixed at pole (startX), max flutter at right edge
  const wave = (x: number) => {
    const u = (x - startX) / width;
    const flutter = Math.sin(phase - u * 8) * 16 * u + Math.sin(phase * 2.3 - u * 16) * 5 * u;
    return flutter;
  };

  // Top half: Merah (Vibrant Red)
  g.beginPath();
  g.moveTo(startX, topY);
  for (let i = 0; i <= steps; i++) {
    const x = startX + i * dx;
    g.lineTo(x, topY + wave(x));
  }
  for (let i = steps; i >= 0; i--) {
    const x = startX + i * dx;
    g.lineTo(x, midY + wave(x));
  }
  g.closePath();
  g.fillStyle = "#dc2626"; // Indonesian red
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = "#991b1b";
  g.stroke();

  // Bottom half: Putih (Pure White)
  g.beginPath();
  g.moveTo(startX, midY);
  for (let i = 0; i <= steps; i++) {
    const x = startX + i * dx;
    g.lineTo(x, midY + wave(x));
  }
  for (let i = steps; i >= 0; i--) {
    const x = startX + i * dx;
    g.lineTo(x, botY + wave(x));
  }
  g.closePath();
  g.fillStyle = "#f8fafc"; // Indonesian crisp white
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = "#cbd5e1";
  g.stroke();

  // Flutter ripple shadows & highlights across fabric creases
  for (let i = 0; i < steps; i++) {
    const x1 = startX + i * dx;
    const x2 = x1 + dx;
    const slope = (wave(x2) - wave(x1)) / dx;
    if (Math.abs(slope) > 0.08) {
      g.fillStyle = slope > 0 ? "rgba(255, 255, 255, 0.18)" : "rgba(15, 23, 42, 0.16)";
      g.fillRect(x1, topY + wave(x1), dx, height);
    }
  }

  // Country badge "INDONESIA 🇮🇩"
  g.fillStyle = "rgba(15, 23, 42, 0.88)";
  g.beginPath();
  g.roundRect(20, 235, 110, 28, 14);
  g.fill();
  g.strokeStyle = "#dc2626";
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = "#ffffff";
  g.font = "bold 13px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("INDONESIA 🇮🇩", 75, 249);
};

/** waving US flag on a flagpole (representing released country) */
export const usFlag = (p: Pen, phase = 0) => {
  const g = p.g;
  // 1. Flagpole on left
  p.line([[55, 25], [55, 385]], "#94a3b8", 8, false);
  p.line([[54, 25], [54, 385]], "#cbd5e1", 3, false);
  p.dot(55, 22, 11, "#f59e0b");
  p.dot(53, 20, 4, "#fef08a");

  p.dot(55, 55, 5, "#d97706");
  p.dot(55, 205, 5, "#d97706");

  const startX = 58;
  const width = 270;
  const height = 150;
  const topY = 55;

  const steps = 36;
  const dx = width / steps;
  const wave = (x: number) => {
    const u = (x - startX) / width;
    return Math.sin(phase - u * 8) * 16 * u + Math.sin(phase * 2.3 - u * 16) * 5 * u;
  };

  // 7 horizontal stripes (alternating red and white)
  const stripeH = height / 7;
  for (let s = 0; s < 7; s++) {
    const sy1 = topY + s * stripeH;
    const sy2 = sy1 + stripeH;
    g.beginPath();
    g.moveTo(startX, sy1);
    for (let i = 0; i <= steps; i++) {
      const x = startX + i * dx;
      g.lineTo(x, sy1 + wave(x));
    }
    for (let i = steps; i >= 0; i--) {
      const x = startX + i * dx;
      g.lineTo(x, sy2 + wave(x));
    }
    g.closePath();
    g.fillStyle = s % 2 === 0 ? "#dc2626" : "#f8fafc";
    g.fill();
  }

  // Blue canton
  const cantonW = width * 0.44;
  const cantonH = height * (4 / 7);
  const cantonSteps = Math.round(steps * 0.44);
  g.beginPath();
  g.moveTo(startX, topY);
  for (let i = 0; i <= cantonSteps; i++) {
    const x = startX + i * dx;
    g.lineTo(x, topY + wave(x));
  }
  for (let i = cantonSteps; i >= 0; i--) {
    const x = startX + i * dx;
    g.lineTo(x, topY + cantonH + wave(x));
  }
  g.closePath();
  g.fillStyle = "#1e3a8a"; // US Navy blue
  g.fill();

  // White stars
  g.fillStyle = "#ffffff";
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const sx = startX + 16 + c * 26;
      const sy = topY + 14 + r * 22 + wave(sx);
      g.beginPath();
      g.arc(sx, sy, 3.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Crease shading
  for (let i = 0; i < steps; i++) {
    const x1 = startX + i * dx;
    const x2 = x1 + dx;
    const slope = (wave(x2) - wave(x1)) / dx;
    if (Math.abs(slope) > 0.08) {
      g.fillStyle = slope > 0 ? "rgba(255, 255, 255, 0.18)" : "rgba(15, 23, 42, 0.16)";
      g.fillRect(x1, topY + wave(x1), dx, height);
    }
  }

  // Country badge "USA 🇺🇸"
  g.fillStyle = "rgba(15, 23, 42, 0.88)";
  g.beginPath();
  g.roundRect(30, 235, 90, 28, 14);
  g.fill();
  g.strokeStyle = "#2563eb";
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = "#ffffff";
  g.font = "bold 13px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("USA 🇺🇸", 75, 249);
};

// ---------------- staging ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const ZAKY_SIT: V3 = [0.6, 0, -2.1];
const ZAKY_STREET: V3 = [-20.2, 0, 2.2]; // in front of house B's front face (z 0.5), clear of its window
const NEIGHBOUR_AT: V3 = [-27.8, 0, 2.2]; // in front of house A's front face
const PHONE_SMALL: V3 = [1.02, 1.18, -1.95];
const DOTS_ROOM: V3 = [0.6, 1.0, -1.5];
const PHONE_BIG: V3 = [0.6, 1.5, -1.2];
const CARD_POS: V3[] = [[21.5, 9.8, -1.2], [24, 10.1, -1.6], [26.5, 9.8, -1.2]];
const CART_POS: V3 = [24, 8.7, 1.6];
const CLOCK_POS: V3 = [-20.2, 3.2, 1.5]; // floats in front of house B, above Zaky
const COOKER_COLS = ["#dc2626", "#2563eb", "#f59e0b"];

const dotsPlace = (cam: CamInfo, x: number, y: number, z: number, scale: number, tilt: number, blink: number): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 0.6, z));
  const [w, h, k] = tier(d);
  return {
    key: `dots|${q(tilt, 60)}|${blink}`, x, y, z, scale,
    draw: (p) => dotsBot(p, tilt, blink), size: [w, h, k],
  };
};

/** everything with a face (or a drawn prop) in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const zaky = (x: number, y: number, z: number, fo: FrontOpts, scale = 1) =>
    out.places.push(person(cam, { i: 1, o: ZAKY, okey: "zaky" }, x, y, z, { side: false, mirror: false }, fo, {}, scale));

  if (id === 1) {
    zaky(ZAKY_SIT[0], ZAKY_SIT[1], ZAKY_SIT[2], { mode: "sit", expr: "grin", blink: lidAt(t, 1) });
    blob(out, ZAKY_SIT[0], 0, ZAKY_SIT[2]);
    // phone in his hand from the first frame
    out.fx.push({ key: "phone", cw: 400, ch: 600, draw: (p) => phoneCard(p), x: PHONE_SMALL[0], y: PHONE_SMALL[1], z: PHONE_SMALL[2], w: 0.24, h: 0.36, rot: -0.15 });
    // Dots pops out of the phone at DOTS_POP, then rises beside him
    const u = smooth((t - DOTS_POP) / 0.4);
    if (u > 0 && u < 1) {
      const rise = easeOut(Math.min(1, (t - DOTS_POP) / 1.2));
      const dx = PHONE_SMALL[0] + (0.75 - PHONE_SMALL[0]) * rise, dy = 0.85 + 0.25 * rise + dotsBob(t), dz = PHONE_SMALL[2] + (DOTS_ROOM[2] - PHONE_SMALL[2]) * rise;
      out.places.push(dotsPlace(cam, dx, dy, dz, 0.55 * (0.6 + 0.4 * u), 0.08 * Math.sin(t * 2), 0));
      out.fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: dx, y: dy + 0.55, z: dz, w: 0.7, h: 0.7 });
    } else if (u >= 1) {
      // Dots has landed: hover beside Zaky (no burst — it only flashes during the pop)
      const rise = easeOut(Math.min(1, (t - DOTS_POP) / 1.2));
      const dx = PHONE_SMALL[0] + (0.75 - PHONE_SMALL[0]) * rise, dy = 0.85 + 0.25 * rise + dotsBob(t), dz = PHONE_SMALL[2] + (DOTS_ROOM[2] - PHONE_SMALL[2]) * rise;
      out.places.push(dotsPlace(cam, dx, dy, dz, 0.55, 0.08 * Math.sin(t * 2), 0));
    }
  }
  if (id === 2) {
    zaky(ZAKY_SIT[0], ZAKY_SIT[1], ZAKY_SIT[2], { mode: "sit", expr: t < WALLET_T - 1.5 ? "grin" : "laugh", blink: lidAt(t, 1) });
    blob(out, ZAKY_SIT[0], 0, ZAKY_SIT[2]);
    // Dots hovers by his shoulder, listening
    out.places.push(dotsPlace(cam, 1.25, 1.0 + dotsBob(t), -2.35, 0.5, 0.1, 0));
  }
  if (id === 3) {
    zaky(ZAKY_SIT[0], ZAKY_SIT[1], ZAKY_SIT[2], { mode: "sit", expr: "neutral", blink: lidAt(t, 1) });
    blob(out, ZAKY_SIT[0], 0, ZAKY_SIT[2]);
    // Dots floats in front, presenting the wallet
    const wu = smooth((t - WALLET_T) / 0.5);
    out.places.push(dotsPlace(cam, DOTS_ROOM[0], DOTS_ROOM[1] + dotsBob(t), DOTS_ROOM[2], 0.6, -0.06 * Math.sin(t * 1.5), 0));
    if (wu > 0) {
      out.fx.push({ key: `wallet|${q(wu, 30)}`, cw: 400, ch: 600, draw: (p) => walletCard(p), x: 0.78, y: 1.42 + 0.06 * wu, z: -1.3, w: 0.5 * wu + 0.01, h: 0.62 * wu + 0.01, rot: 0.1 * (1 - wu) });
      if (wu > 0.6) out.fx.push({ key: `stars${q(t, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(t, 30)), x: 0.78, y: 1.95, z: -1.3, w: 0.5, h: 0.25 });
    }
  }
  if (id === 4) {
    // 1. Phone displaying Voice Chat Interface during prompt phase (t < 22.0)
    if (t < 22.0) {
      const pu = smooth((t - 17.72) / 0.4);
      out.fx.push({
        key: `tokpedvoice|${q(pu, 20)}`,
        cw: 400,
        ch: 600,
        draw: (p) => phoneVoiceCard(p, t),
        x: 24,
        y: 10.0 + 0.04 * Math.sin(t * 2),
        z: 7.2,
        w: 0.85 * pu + 0.01,
        h: 1.28 * pu + 0.01,
        rot: 0,
      });
    }

    // 2. Authentic Metal Wire Supermarket Shopping Cart at CART_POS
    out.fx.push({
      key: "shopCart",
      cw: 400,
      ch: 400,
      draw: (p) => shoppingCart(p),
      x: CART_POS[0],
      y: CART_POS[1] + 0.35,
      z: CART_POS[2],
      w: 1.25,
      h: 1.25,
    });

    // 3. Three rice cookers on the platform
    CARD_POS.forEach(([x, y, z], i) => {
      const bob = cardBob(t, i);
      if (i === 1) {
        const u = pickU(t);
        const cx = x + (CART_POS[0] - x) * u, cy = y + (CART_POS[1] + 0.4 - y) * u, cz = z + (CART_POS[2] - z) * u;
        const sc = 1 - 0.25 * u;
        out.fx.push({ key: `cooker1|${q(u, 60)}`, cw: 400, ch: 400, draw: (p) => riceCooker(p, COOKER_COLS[1]), x: cx, y: cy + bob * (1 - u), z: cz, w: 0.95 * sc, h: 0.95 * sc, rot: 0.3 * u });
        if (u > 0.55 && u < 1) out.fx.push({ key: `ring${q(u, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q(u, 30)), x: CART_POS[0], y: CART_POS[1] + 0.5, z: CART_POS[2], w: 1.0, h: 1.0, rot: 0 });
      } else {
        out.fx.push({ key: `cooker${i}`, cw: 400, ch: 400, draw: (p) => riceCooker(p, COOKER_COLS[i]), x, y: y + bob, z, w: 0.95, h: 0.95 });
      }
    });

    // 4. Dots AI Agent: Checking one by one, then picking up Cooker 1 and placing it into the cart!
    if (t >= 22.0) {
      if (t < 23.8) {
        // Inspecting Cooker 0 (Left: Rp 750k - Over budget)
        out.places.push(dotsPlace(cam, 21.5, 10.7 + dotsBob(t), -1.0, 0.55, 0.15, 0));
        out.fx.push({ key: "badge0", cw: 400, ch: 160, draw: (p) => scanBadge(p, "🤔 Cek Spesifikasi...", "❌ Rp 750k (Over budget)", "#ef4444"), x: 21.5, y: 11.6, z: -1.0, w: 0.72, h: 0.28 });
        out.fx.push({ key: "beam0", cw: 200, ch: 400, draw: (p) => scanBeam(p, "#ef4444"), x: 21.5, y: 10.3, z: -1.0, w: 0.35, h: 0.65 });
      } else if (t < 25.4) {
        // Inspecting Cooker 2 (Right: Rp 650k - Kemahalan)
        out.places.push(dotsPlace(cam, 26.5, 10.7 + dotsBob(t), -1.0, 0.55, -0.15, 0));
        out.fx.push({ key: "badge2", cw: 400, ch: 160, draw: (p) => scanBadge(p, "🤔 Cek Rating...", "❌ Rp 650k (Kemahalan)", "#ef4444"), x: 26.5, y: 11.6, z: -1.0, w: 0.72, h: 0.28 });
        out.fx.push({ key: "beam2", cw: 200, ch: 400, draw: (p) => scanBeam(p, "#ef4444"), x: 26.5, y: 10.3, z: -1.0, w: 0.35, h: 0.65 });
      } else if (t < PICK_T) {
        // Inspecting Cooker 1 (Center: Rp 499k - Match!)
        out.places.push(dotsPlace(cam, 24.0, 11.0 + dotsBob(t), -1.4, 0.55, 0, 0));
        out.fx.push({ key: "badge1", cw: 400, ch: 160, draw: (p) => scanBadge(p, "✨ Rating 4.9 • Official Store", "✅ Rp 499k (Cocok Banget!)", "#10b981"), x: 24.0, y: 11.9, z: -1.4, w: 0.78, h: 0.3 });
        out.fx.push({ key: "beam1", cw: 200, ch: 400, draw: (p) => scanBeam(p, "#10b981"), x: 24.0, y: 10.5, z: -1.4, w: 0.35, h: 0.65 });
      } else {
        // Dots carries Cooker 1 down into the wire shopping cart!
        const u = pickU(t);
        const x = 24.0, y = 10.1, z = -1.6;
        const cx = x + (CART_POS[0] - x) * u, cy = y + (CART_POS[1] + 0.4 - y) * u, cz = z + (CART_POS[2] - z) * u;
        if (u < 1) {
          out.places.push(dotsPlace(cam, cx, cy + 0.42, cz - 0.08, 0.52, 0.05 * Math.sin(t * 4), 0));
        } else {
          out.places.push(dotsPlace(cam, 24.0, 9.8 + dotsBob(t), 1.5, 0.55, 0.08 * Math.sin(t * 3), 0));
          const bt = t - PICK_T - 0.55;
          if (bt > 0 && bt < 0.6) {
            out.fx.push({ key: `burst${q(bt, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(bt / 0.6, 30)), x: CART_POS[0], y: CART_POS[1] + 0.6, z: CART_POS[2], w: 0.7, h: 0.7 });
          }
        }
      }
    }
  }
  if (id === 5) {
    const press = tapU(t);
    // Beautiful proportional checkout approval phone
    out.fx.push({
      key: `phoneapproval|${q(press, 30)}`,
      cw: 400,
      ch: 600,
      draw: (p) => approvalPhoneCard(p, press, t),
      x: PHONE_BIG[0],
      y: PHONE_BIG[1],
      z: PHONE_BIG[2],
      w: 0.65,
      h: 0.98,
    });

    // Natural thumb pressing UP from the bottom edge into the button
    const fy = PHONE_BIG[1] - 0.38 + 0.16 * press;
    out.fx.push({
      key: `thumb|${q(press, 30)}`,
      cw: 400,
      ch: 400,
      draw: (p) => thumbUp(p),
      x: PHONE_BIG[0],
      y: fy,
      z: PHONE_BIG[2] + 0.05,
      w: 0.16,
      h: 0.22,
    });

    if (press > 0.7) {
      out.fx.push({
        key: `tapring${q(press, 30)}`,
        cw: 600,
        ch: 600,
        draw: (p) => fxRing(p, q(press, 30)),
        x: PHONE_BIG[0],
        y: PHONE_BIG[1] - 0.18,
        z: PHONE_BIG[2] + 0.03,
        w: 0.35,
        h: 0.35,
      });
    }
  }
  if (id === 6) {
    // Zaky sitting holding his real card safely with both hands
    zaky(0.6, 0, -1.65, { mode: "sit", expr: "smile", prop: "card", blink: lidAt(t, 1) });
    blob(out, 0.6, 0, -1.65);

    // Dots hovering beside Zaky
    out.places.push(dotsPlace(cam, 1.15, 1.35 + 0.05 * Math.sin(t * 3), -1.5, 0.45, 0.06 * Math.sin(t * 2), lidAt(t, 1)));
    blob(out, 1.15, 0, -1.5, 0.35);

    // Card flip / token burst
    const u = tokenU(t);
    if (u > 0.4 && u < 1) {
      out.fx.push({
        key: `tokburst${q(u, 30)}`,
        cw: 500,
        ch: 500,
        draw: (p) => fxBurst(p, q((u - 0.4) / 0.6, 30)),
        x: 0.6,
        y: 1.35,
        z: -1.45,
        w: 0.45,
        h: 0.45,
      });
    }
  }
  if (id === 7) {
    const waveIdx = Math.round(t * 30) % 60;
    const wavePhase = waveIdx * ((2 * Math.PI) / 60);

    // 1. NEIGHBOUR (US customer, where AI shopping is already released)
    out.places.push(person(cam, { i: 2, o: NEIGHBOUR, okey: "neigh" }, NEIGHBOUR_AT[0], NEIGHBOUR_AT[1], NEIGHBOUR_AT[2],
      { side: false, mirror: false }, { mode: "stand", expr: "laugh", wave: t > CTA_T ? q(Math.sin(t * 6), 30) : undefined, blink: lidAt(t, 2) }, {}));
    blob(out, NEIGHBOUR_AT[0], 0, NEIGHBOUR_AT[2]);

    // US Flag waving beside Neighbour
    out.fx.push({
      key: `usflag|${waveIdx}`,
      cw: 400, ch: 400,
      draw: (p) => usFlag(p, wavePhase),
      x: NEIGHBOUR_AT[0] - 0.95, y: 1.55, z: NEIGHBOUR_AT[2],
      w: 0.95, h: 0.95,
    });
    blob(out, NEIGHBOUR_AT[0] - 0.95, 0, NEIGHBOUR_AT[2], 0.35);

    // Cute AI agent (Dots) hovering happily beside Neighbour with delivered package!
    const dotsHoverY = 1.15 + 0.08 * Math.sin(t * 3);
    out.places.push(dotsPlace(cam, NEIGHBOUR_AT[0] + 0.9, dotsHoverY, NEIGHBOUR_AT[2] - 0.1, 0.45, 0.08 * Math.sin(t * 2.5), lidAt(t, 2)));
    blob(out, NEIGHBOUR_AT[0] + 0.9, 0, NEIGHBOUR_AT[2] - 0.1, 0.4);

    out.fx.push({ key: `pkgstars${q(t, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(t, 30)), x: -27.8, y: 1.5, z: 2.4, w: 0.7, h: 0.35 });

    // 2. ZAKY (Indonesian character, waiting for release)
    zaky(ZAKY_STREET[0], ZAKY_STREET[1], ZAKY_STREET[2], { mode: "stand", expr: "smile", wave: t > CTA_T ? q(Math.sin(t * 6 + 1), 30) : undefined, blink: lidAt(t, 1) });
    blob(out, ZAKY_STREET[0], 0, ZAKY_STREET[2]);

    // Indonesian Flag (Merah Putih) waving proudly beside Zaky
    out.fx.push({
      key: `idflag|${waveIdx}`,
      cw: 400, ch: 400,
      draw: (p) => indonesiaFlag(p, wavePhase),
      x: ZAKY_STREET[0] + 0.95, y: 1.55, z: ZAKY_STREET[2],
      w: 0.95, h: 0.95,
    });
    blob(out, ZAKY_STREET[0] + 0.95, 0, ZAKY_STREET[2], 0.35);

    // Waiting clock above Zaky
    const cu = clockU(t);
    if (cu > 0) {
      out.fx.push({ key: `clock|${q(cu, 30)}`, cw: 400, ch: 400, draw: (p) => clockFace(p, t), x: CLOCK_POS[0], y: CLOCK_POS[1], z: CLOCK_POS[2], w: 0.95 * cu, h: 0.95 * cu });
    }
  }
  return out;
};
export { FPS };
