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

// ---------------- drawn props (Fx cards, no text anywhere) ----------------
/** a smartphone, screen glowing */
export const phoneCard = (p: Pen, glow = "#bfdbfe") => {
  p.poly([[60, 20], [340, 20], [340, 580], [60, 580]], "#1e293b", 12);
  p.poly([[80, 40], [320, 40], [320, 540], [80, 540]], glow, 6);
  p.ell(200, 560, 14, 14, "#475569", 4);
};
/** a wallet with cards fanned out of it */
export const walletCard = (p: Pen) => {
  p.poly([[70, 260], [330, 260], [330, 480], [70, 480]], "#b45309", 12);
  p.poly([[90, 180], [310, 180], [310, 300], [90, 300]], "#2563eb", 10);
  p.poly([[110, 120], [300, 120], [300, 240], [110, 240]], "#dc2626", 10);
  p.ell(270, 370, 34, 34, "#fbbf24", 8);
};
/** a rice cooker: body, lid, button, steam curls. col = body colour */
export const riceCooker = (p: Pen, col: string) => {
  p.arc(200, 120, 40, 26, 200, 340, 10, "#94a3b8");
  p.arc(260, 100, 34, 22, 200, 340, 10, "#94a3b8");
  p.poly([[90, 180], [310, 180], [300, 420], [100, 420]], col, 12);
  p.ell(200, 300, 105, 14, "#00000022", 0);
  p.ell(200, 380, 26, 26, "#fbbf24", 8);
  p.poly([[150, 150], [250, 150], [250, 175], [150, 175]], "#1e293b", 6);
};
/** a fingerprint: concentric arcs */
export const fingerprint = (p: Pen) => {
  for (let r = 28; r <= 130; r += 26) p.arc(200, 210, r, r * 1.15, 200, 340, 9, "#1e293b");
  for (let r = 40; r <= 118; r += 26) p.arc(200, 210, r, r * 1.15, 20, 160, 9, "#1e293b");
};
/** a fingertip pressing down */
export const fingerTip = (p: Pen) => {
  p.poly([[140, 40], [260, 40], [260, 300], [140, 300]], "#ffe2c2", 12);
  p.ell(200, 300, 60, 46, "#ffe2c2", 12);
  p.ell(200, 285, 34, 20, "#f5c9a0", 0);
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
    // three rice cookers float; Dots flies between them, compares, then picks the middle one
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
    // Dots: left card -> middle (compare) -> dives to the cart on the pick
    const cx = t < COMPARE_T ? 22.6 : t < PICK_T ? 24 : 24;
    const cy = t < PICK_T ? 9.9 + dotsBob(t) : 9.9 - (9.9 - 8.9) * pickU(t) + dotsBob(t) * (1 - pickU(t));
    const cz = t < COMPARE_T ? -0.4 : t < PICK_T ? -0.9 : 0.6 + 0.6 * pickU(t);
    out.places.push(dotsPlace(cam, cx, cy - 0.9, cz, 0.6, t < COMPARE_T ? 0.12 : -0.08, 0));
    // burst only while the cooker lands (0.5 s after the flight ends), then gone
    const bt = t - PICK_T - 0.55;
    if (bt > 0 && bt < 0.5) out.fx.push({ key: `burst${q(bt, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(bt / 0.5, 30)), x: CART_POS[0], y: CART_POS[1] + 0.6, z: CART_POS[2], w: 0.6, h: 0.6 });
  }
  if (id === 5) {
    // big phone close-up; the fingerprint glows; the finger descends and taps at TAP_T
    out.fx.push({ key: "phonebig", cw: 400, ch: 800, draw: (p) => phoneCard(p, "#dbeafe"), x: PHONE_BIG[0], y: PHONE_BIG[1], z: PHONE_BIG[2], w: 0.62, h: 1.1 });
    const fp = 0.5 + 0.5 * Math.sin(t * 3);
    out.fx.push({ key: `fp|${q(fp, 30)}`, cw: 400, ch: 400, draw: (p) => fingerprint(p), x: PHONE_BIG[0], y: PHONE_BIG[1] + 0.08, z: PHONE_BIG[2] + 0.02, w: 0.44, h: 0.44 });
    const press = tapU(t);
    const fy = PHONE_BIG[1] + 0.75 - 0.55 * press;
    out.fx.push({ key: `finger|${q(press, 30)}`, cw: 400, ch: 400, draw: (p) => fingerTip(p), x: PHONE_BIG[0], y: fy, z: PHONE_BIG[2] + 0.06, w: 0.26, h: 0.4 });
    if (press > 0.7) out.fx.push({ key: `tapring${q(press, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q(press, 30)), x: PHONE_BIG[0], y: PHONE_BIG[1] + 0.08, z: PHONE_BIG[2] + 0.04, w: 0.5, h: 0.5 });
  }
  if (id === 6) {
    // the card (3D, in world.ts) flips into a token; sparkles burst as it lands (only during the flip)
    const u = tokenU(t);
    if (u > 0.4 && u < 1) out.fx.push({ key: `tokburst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q((u - 0.4) / 0.6, 30)), x: PHONE_BIG[0], y: PHONE_BIG[1], z: PHONE_BIG[2], w: 0.45, h: 0.45 });
  }
  if (id === 7) {
    // golden street: neighbour waves by the delivered package; Zaky waits by the clock
    out.places.push(person(cam, { i: 2, o: NEIGHBOUR, okey: "neigh" }, NEIGHBOUR_AT[0], NEIGHBOUR_AT[1], NEIGHBOUR_AT[2],
      { side: false, mirror: false }, { mode: "stand", expr: "laugh", wave: t > CTA_T ? q(Math.sin(t * 6), 30) : undefined, blink: lidAt(t, 2) }, {}));
    blob(out, NEIGHBOUR_AT[0], 0, NEIGHBOUR_AT[2]);
    zaky(ZAKY_STREET[0], ZAKY_STREET[1], ZAKY_STREET[2], { mode: "stand", expr: "smile", wave: t > CTA_T ? q(Math.sin(t * 6 + 1), 30) : undefined, blink: lidAt(t, 1) });
    blob(out, ZAKY_STREET[0], 0, ZAKY_STREET[2]);
    const cu = clockU(t);
    if (cu > 0) {
      out.fx.push({ key: `clock|${q(cu, 30)}`, cw: 400, ch: 400, draw: (p) => clockFace(p, t), x: CLOCK_POS[0], y: CLOCK_POS[1], z: CLOCK_POS[2], w: 0.95 * cu, h: 0.95 * cu });
    }
    out.fx.push({ key: `pkgstars${q(t, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(t, 30)), x: -27.8, y: 1.5, z: 2.4, w: 0.7, h: 0.35 });
  }
  return out;
};
export { FPS };
