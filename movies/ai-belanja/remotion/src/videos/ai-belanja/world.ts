// The whole place as one three.js scene: a living room (shots 1-3, 5-6), a floating
// sky platform with product cards (shot 4), and a golden street with two houses
// (shot 7). One sky, one light rig (camera-relative sun, frozen per shot), clouds,
// and the cast. update(id, f, camera) poses everything for shot `id` at frame f
// (pure function of id + f). No Kenney kit: every prop is built from primitives
// and painted textures (the GLBs are not in the template clone).
import * as THREE from "three";
import { Batch, boxGeo, quad, V, lam, house, Kit } from "./build";
import { ctex, planksHD, stoneHD, grassHD, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, D0, SHOTS, camAt, V3, smooth, ShotDef } from "./story";
import { tokenU } from "./story";
import { drawChatGPTLogo } from "./logos";

/** no external kit in this project: loadKit resolves an empty kit (props are primitives) */
export const loadKit = () => Promise.resolve({} as Kit);

const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 7: { az: -70, el: 8 } };

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
/** painted card face: authentic ChatGPT Wallet credit card */
const cardFaceTex = () => ctex("cardFace", 512, 320, (g) => {
  // Sleek black and emerald gradient
  const gr = g.createLinearGradient(0, 0, 512, 320);
  gr.addColorStop(0, "#065f46");
  gr.addColorStop(0.6, "#047857");
  gr.addColorStop(1, "#10b981");
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 320);

  // Decorative sleek metallic ring
  g.strokeStyle = "rgba(255, 255, 255, 0.4)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(460, 60, 160, 0, Math.PI * 2);
  g.stroke();

  // ChatGPT Logo & Branding
  drawChatGPTLogo(g, 450, 48, 28, "#ffffff");
  g.fillStyle = "#ffffff";
  g.font = "bold 20px 'Segoe UI', sans-serif";
  g.textAlign = "right";
  g.fillText("ChatGPT Wallet", 405, 56);

  // Gold EMV Chip
  g.fillStyle = "#f59e0b";
  g.fillRect(48, 80, 75, 55);
  g.strokeStyle = "#b45309";
  g.lineWidth = 3;
  g.strokeRect(48, 80, 75, 55);
  // Chip circuit traces
  g.beginPath();
  g.moveTo(48, 107); g.lineTo(123, 107);
  g.moveTo(85, 80); g.lineTo(85, 135);
  g.stroke();

  // Contactless waves
  g.strokeStyle = "rgba(255, 255, 255, 0.8)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(150, 107, 12, -Math.PI / 3, Math.PI / 3);
  g.stroke();
  g.beginPath();
  g.arc(150, 107, 20, -Math.PI / 3, Math.PI / 3);
  g.stroke();

  // Card Number (masked)
  g.fillStyle = "#ffffff";
  g.font = "bold 24px monospace";
  g.textAlign = "left";
  g.fillText("••••   ••••   ••••   9821", 48, 205);

  // Cardholder name & Expiry
  g.fillStyle = "#94a3b8";
  g.font = "12px sans-serif";
  g.fillText("CARDHOLDER", 48, 248);
  g.fillText("EXPIRES", 240, 248);

  g.fillStyle = "#ffffff";
  g.font = "bold 16px sans-serif";
  g.fillText("ZAKY", 48, 274);
  g.fillText("11/29", 240, 274);

  // Mastercard / Visa emblem
  g.fillStyle = "#ef4444";
  g.beginPath(); g.arc(430, 260, 24, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#f59e0b";
  g.beginPath(); g.arc(460, 260, 24, 0, Math.PI * 2); g.fill();
});

type Mats = Record<string, THREE.Material>;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private cloudPuffs: THREE.Sprite[] = [];
  private cardMesh: THREE.Mesh; private tokenMesh: THREE.Mesh;
  private cardMats: THREE.Material[];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root, M: Mats = {};
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- materials ----
    M.floor = lam("floorPlanks", () => ({ map: planksHD() }));
    M.wall = lam("wallCream", () => ({ map: stoneHD("wallCream", ["#e8dcc8", "#e2d5bd", "#efe5d2", "#dccfb6"], "#c9b896") }));
    M.trim = lam("trimWhite", () => ({ color: "#f4f1ea" }));
    M.couch = lam("couch", () => ({ color: "#c65a3a" }));
    M.cushion = lam("cushion", () => ({ color: "#d4694a" }));
    M.darkwood = lam("darkwood", () => ({ color: "#5a3b2a" }));
    M.rugB = lam("rugB", () => ({ color: "#b4552d" }));
    M.rugI = lam("rugI", () => ({ color: "#d9a05b" }));
    M.leaf = lam("leaf", () => ({ color: "#4a7c3a" }));
    M.pot = lam("pot", () => ({ color: "#b4552d" }));
    M.shade = lam("shade", () => ({ color: "#f2c879" }));
    M.book = lam("book", () => ({ color: "#2563eb" }));
    M.mug = lam("mug", () => ({ color: "#f59e0b" }));
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.isleTop = lam("isleTop", () => ({ map: grassHD() }));
    M.isleSide = lam("isleSide", () => ({ map: stoneHD("isleSide", ["#c9bcaa", "#bfb19f", "#d1c5b4", "#b8aa97"], "#958776") }));
    M.basket = lam("basket", () => ({ color: "#a16207" }));
    M.basketDark = lam("basketDark", () => ({ color: "#7c4a03" }));
    M.pkg = lam("pkg", () => ({ color: "#d9a05b" }));
    M.tape = lam("tape", () => ({ color: "#f4f1ea" }));
    M.dot = lam("dotPath", () => ({ color: "#8a7a5a" }));

    const b = new Batch();
    // ---- living room (floor y = 0, room x -5..5, z -4..4) ----
    b.add(quad(V(-5, 0, 4), V(5, 0, 4), V(5, 0, -4), V(-5, 0, -4), 5, 4), M.floor);
    // rug under the coffee table
    b.add(quad(V(-1.2, 0.012, 0.4), V(2.4, 0.012, 0.4), V(2.4, 0.012, -2.2), V(-1.2, 0.012, -2.2)), M.rugB);
    b.add(quad(V(-1.0, 0.014, 0.2), V(2.2, 0.014, 0.2), V(2.2, 0.014, -2.0), V(-1.0, 0.014, -2.0)), M.rugI);
    // back wall (z = -4) with a window hole x -3.2..-0.8, y 1.2..2.8
    const W = (x0: number, x1: number, y0: number, y1: number) =>
      quad(V(x0, y0, -4), V(x1, y0, -4), V(x1, y1, -4), V(x0, y1, -4));
    b.add(W(-5, -3.2, 0, 3.4), M.wall);
    b.add(W(-0.8, 5, 0, 3.4), M.wall);
    b.add(W(-3.2, -0.8, 0, 1.2), M.wall);
    b.add(W(-3.2, -0.8, 2.8, 3.4), M.wall);
    // window frame + sill
    b.add(boxGeo(V(-3.3, 1.1, -4.08), V(-3.2, 2.9, -3.92), 0), M.trim);
    b.add(boxGeo(V(-0.8, 1.1, -4.08), V(-0.7, 2.9, -3.92), 0), M.trim);
    b.add(boxGeo(V(-3.3, 2.8, -4.08), V(-0.7, 2.9, -3.92), 0), M.trim);
    b.add(boxGeo(V(-3.3, 1.1, -4.08), V(-0.7, 1.2, -3.92), 0), M.trim);
    b.add(boxGeo(V(-3.4, 1.02, -4.15), V(-0.6, 1.1, -3.85), 0), M.trim);
    // side walls
    b.add(quad(V(-5, 0, -4), V(-5, 0, 4), V(-5, 3.4, 4), V(-5, 3.4, -4)), M.wall);
    b.add(quad(V(5, 0, 4), V(5, 0, -4), V(5, 3.4, -4), V(5, 3.4, 4)), M.wall);
    // couch at (0.6, 0, -2.6), facing +z
    b.add(boxGeo(V(-0.35, 0.1, -3.02), V(1.55, 0.55, -2.18), 0), M.couch);          // base
    b.add(boxGeo(V(-0.35, 0.55, -3.02), V(1.55, 1.35, -2.78), 0), M.couch);         // back
    b.add(boxGeo(V(-0.35, 0.55, -3.02), V(-0.1, 1.0, -2.18), 0), M.couch);          // left arm
    b.add(boxGeo(V(1.3, 0.55, -3.02), V(1.55, 1.0, -2.18), 0), M.couch);            // right arm
    b.add(boxGeo(V(-0.1, 0.55, -2.95), V(0.6, 0.72, -2.2), 0), M.cushion);          // cushion L
    b.add(boxGeo(V(0.6, 0.55, -2.95), V(1.3, 0.72, -2.2), 0), M.cushion);           // cushion R
    for (const [lx, lz] of [[-0.28, -2.95], [1.48, -2.95], [-0.28, -2.25], [1.48, -2.25]] as const)
      b.add(boxGeo(V(lx, 0, lz), V(lx + 0.09, 0.1, lz + 0.09), 0), M.darkwood);
    // coffee table at (0.6, 0, -0.9)
    b.add(boxGeo(V(-0.05, 0.38, -1.25), V(1.25, 0.44, -0.55), 0), M.darkwood);
    for (const [lx, lz] of [[0.0, -1.2], [1.15, -1.2], [0.0, -0.6], [1.15, -0.6]] as const)
      b.add(boxGeo(V(lx, 0, lz), V(lx + 0.06, 0.38, lz + 0.06), 0), M.darkwood);
    b.add(boxGeo(V(0.15, 0.44, -1.15), V(0.55, 0.48, -0.85), 0), M.book);           // book
    const mug = new THREE.CylinderGeometry(0.05, 0.045, 0.09, 12); mug.translate(0, 0.045, 0);
    b.add(mug, M.mug, new THREE.Matrix4().makeTranslation(0.95, 0.44, -0.75));     // mug
    // plant at (-3.6, 0, -3.2)
    const potG = new THREE.CylinderGeometry(0.2, 0.16, 0.35, 12); potG.translate(0, 0.175, 0);
    b.add(potG, M.pot, new THREE.Matrix4().makeTranslation(-3.6, 0, -3.2));
    const cone1 = new THREE.ConeGeometry(0.42, 0.9, 10); cone1.translate(0, 0.45, 0);
    b.add(cone1, M.leaf, new THREE.Matrix4().makeTranslation(-3.6, 0.35, -3.2));
    const cone2 = new THREE.ConeGeometry(0.3, 0.7, 10); cone2.translate(0, 0.35, 0);
    b.add(cone2, M.leaf, new THREE.Matrix4().makeTranslation(-3.6, 0.95, -3.2));
    // floor lamp at (3.6, 0, -3.2)
    const pole = new THREE.CylinderGeometry(0.035, 0.035, 1.5, 8); pole.translate(0, 0.75, 0);
    b.add(pole, M.darkwood, new THREE.Matrix4().makeTranslation(3.6, 0, -3.2));
    const base = new THREE.CylinderGeometry(0.16, 0.18, 0.05, 12); base.translate(0, 0.025, 0);
    b.add(base, M.darkwood, new THREE.Matrix4().makeTranslation(3.6, 0, -3.2));
    const shadeG = new THREE.CylinderGeometry(0.2, 0.28, 0.32, 12, 1, true); shadeG.translate(0, 0.16, 0);
    b.add(shadeG, M.shade, new THREE.Matrix4().makeTranslation(3.6, 1.5, -3.2));

    // ---- floating sky platform at (24, 8, 0) ----
    const plat = new THREE.CylinderGeometry(4, 3.4, 0.4, 48); plat.translate(0, -0.2, 0);
    b.add(plat, M.isleTop, new THREE.Matrix4().makeTranslation(24, 8, 0));

    // ---- golden street: grass, two houses, package, dotted path ----
    // grass extends to z 24 so the wide shot's foreground is lawn, not bare ground
    b.add(quad(V(-32, 0, 24), V(-16, 0, 24), V(-16, 0, -6), V(-32, 0, -6), 8, 6), M.grass);
    house(b, -27, -2, 0, 5.5, 5, 5.2, 1, 0); // ochre
    house(b, -21.5, -2, 0, 5.5, 5, 5.2, 5, 0); // terracotta sand, adjacent to A (no sky gap)
    // package in front of house A (z 2.15-2.65: clear of the front face at z 0.5)
    b.add(boxGeo(V(-28.05, 0, 2.15), V(-27.55, 0.5, 2.65), 0), M.pkg);
    b.add(boxGeo(V(-27.85, 0.5, 2.15), V(-27.75, 0.52, 2.65), 0), M.tape);
    b.add(boxGeo(V(-28.05, 0.5, 2.35), V(-27.55, 0.52, 2.45), 0), M.tape);
    // dotted path from house A toward house B, stopping halfway
    for (let i = 0; i < 7; i++) {
      const dot = new THREE.CircleGeometry(0.13, 16); dot.rotateX(-Math.PI / 2);
      b.add(dot, M.dot, new THREE.Matrix4().makeTranslation(-26.2 + i * 0.55, 0.015, 2.2));
    }
    b.build(R);

    // cloud puffs around the sky platform (sprites, always face the camera)
    const puffTex = cloudHD(7, LOOK.day.cloud);
    for (const [x, y, z, s] of [[19.5, 7.0, -2.5, 5], [28.5, 7.3, -3.5, 6], [24, 6.6, 4.5, 5.5], [20, 9.5, 3.5, 4]] as const) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0.95 }));
      sp.position.set(x, y, z); sp.scale.set(s, s / 2, 1); sp.layers.set(NOINK);
      this.cloudPuffs.push(sp); R.add(sp);
    }

    // ---- card + token (shot 6, posed per frame) ----
    const face = new THREE.MeshLambertMaterial({ map: cardFaceTex() });
    const edge = new THREE.MeshLambertMaterial({ color: "#065f46" });
    this.cardMats = [edge, edge, edge, edge, face, edge];
    this.cardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.02), this.cardMats);
    this.cardMesh.castShadow = true; this.cardMesh.visible = false;
    R.add(this.cardMesh);
    const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#e8c45a", specular: "#fff2c0", shininess: 80 }), 0.15);
    this.tokenMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.035, 32), gold);
    this.tokenMesh.rotation.x = Math.PI / 2; // flat faces toward the camera
    // coin design on both faces (a plain gold disc reads as a blank blob at close range):
    // a darker-gold ring + a 5-point star, so the token reads as a token, not a coin blank.
    // The faces are the cylinder's local +/-Y caps; the star/ring lie in the local XZ plane.
    const faceMat = new THREE.MeshLambertMaterial({ color: "#b8912a" });
    const ringGeo = new THREE.RingGeometry(0.155, 0.18, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.085 : 0.036;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const x = r * Math.cos(a), y = r * Math.sin(a);
      if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
    }
    starShape.closePath();
    const starGeo = new THREE.ShapeGeometry(starShape);
    starGeo.rotateX(-Math.PI / 2);
    for (const side of [1, -1]) {
      const ring = new THREE.Mesh(ringGeo, faceMat);
      ring.position.y = side * 0.019;
      this.tokenMesh.add(ring);
      const star = new THREE.Mesh(starGeo, faceMat);
      star.position.y = side * 0.019;
      if (side < 0) star.rotation.y = Math.PI;
      this.tokenMesh.add(star);
    }
    this.tokenMesh.castShadow = true; this.tokenMesh.visible = false;
    R.add(this.tokenMesh);
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const ss = s as ShotDef & { sunAz?: number; sunEl?: number };
    const az = THREE.MathUtils.degToRad(ss.sunAz ?? SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(ss.sunEl ?? SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig: camera-relative sun frozen per shot, two-tone uniforms, shadow fit ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc + halo, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- card -> token (shot 6: hidden so character physically holds card) ----
    this.cardMesh.visible = false;
    this.tokenMesh.visible = false;
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}
