"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ── City data ────────────────────────────────────────────────────────────────
const CITIES = [
  { lat: 40.71, lon: -74.01 }, // New York
  { lat: 51.51, lon: -0.13 },  // London
  { lat: 50.11, lon:  8.68 },  // Frankfurt
  { lat:  1.35, lon: 103.82 }, // Singapore
  { lat: 35.68, lon: 139.65 }, // Tokyo
  { lat: -23.55, lon: -46.63 },// São Paulo
  { lat: -33.87, lon: 151.21 },// Sydney
];

const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[0,4],[0,5],[3,6],[4,6],[1,3],[5,0],
];

// ── Simplified continent polygons [lon, lat] ─────────────────────────────────
const LAND_POLYS: [number, number][][] = [
  // Africa
  [[-18,35],[-6,36],[10,38],[28,36],[34,26],[40,14],[44,4],[44,-10],
   [36,-18],[28,-34],[18,-34],[16,-28],[12,-5],[8,4],[2,5],[-2,5],
   [-8,5],[-15,10],[-17,14],[-18,35]],

  // South America
  [[-80,12],[-76,8],[-65,1],[-50,5],[-36,-5],[-35,-10],[-38,-18],
   [-45,-24],[-52,-32],[-57,-38],[-62,-46],[-66,-56],[-68,-55],
   [-74,-44],[-72,-30],[-70,-18],[-74,-8],[-80,0],[-80,12]],

  // North America (main body)
  [[-84,8],[-80,9],[-76,26],[-74,44],[-65,44],[-60,47],[-64,48],
   [-60,48],[-64,56],[-68,60],[-76,64],[-80,72],[-86,73],[-100,73],
   [-120,73],[-140,70],[-156,60],[-162,60],[-168,66],[-168,55],
   [-140,56],[-130,54],[-126,49],[-124,47],[-121,37],[-118,32],
   [-110,23],[-95,18],[-88,15],[-84,15],[-84,8]],

  // Greenland
  [[-74,65],[-74,76],[-55,82],[-26,84],[-18,80],[-20,76],[-22,72],
   [-36,65],[-52,70],[-62,72],[-68,76],[-74,76],[-74,65]],

  // Europe main body
  [[-10,36],[2,43],[8,45],[28,46],[30,46],[28,66],[26,70],[16,70],
   [8,64],[4,58],[-8,58],[-8,37],[-10,36]],

  // Scandinavia
  [[5,58],[10,57],[16,57],[22,58],[28,66],[26,70],[16,70],[8,64],
   [4,58],[5,58]],

  // British Isles
  [[-5,50],[-2,50],[-2,52],[0,52],[0,54],[-4,56],[-6,58],[-8,56],
   [-5,52],[-5,50]],

  // Iceland
  [[-24,64],[-14,63],[-12,65],[-16,66],[-24,66],[-24,64]],

  // Asia (Siberia + Central + East)
  [[26,44],[34,36],[38,38],[42,38],[44,40],[50,44],[60,44],[70,40],
   [80,46],[90,50],[100,52],[116,50],[132,48],[140,60],[148,52],
   [146,44],[140,36],[130,32],[122,30],[110,22],[104,12],[100,4],
   [100,1],[104,12],[112,22],[122,30],[130,32],[140,36],[146,44],
   [148,52],[140,60],[132,65],[120,72],[100,72],[80,72],[60,70],
   [50,70],[42,68],[30,68],[26,66],[26,60],[26,44]],

  // Indian Subcontinent
  [[62,24],[68,24],[72,22],[78,8],[80,2],[80,14],[86,18],[90,22],
   [94,24],[92,22],[86,18],[80,14],[78,8],[72,8],[66,22],[62,24]],

  // Arabian Peninsula
  [[34,30],[36,28],[40,20],[44,14],[44,12],[52,12],[58,22],[56,24],
   [50,26],[44,26],[40,22],[38,20],[36,22],[34,30]],

  // Indochina + Southeast Asia
  [[100,22],[104,22],[108,14],[104,4],[100,4],[98,4],[96,16],[100,22]],

  // Malay Peninsula
  [[100,4],[104,4],[108,2],[104,-2],[102,-4],[100,-2],[100,4]],

  // Japan (Honshu)
  [[130,32],[134,34],[136,36],[140,36],[142,40],[140,44],[132,42],
   [130,32]],

  // Australia
  [[114,-22],[114,-32],[118,-36],[122,-34],[130,-32],[138,-36],
   [144,-40],[150,-38],[154,-26],[154,-22],[146,-18],[136,-12],
   [130,-12],[124,-18],[120,-22],[114,-22]],

  // New Guinea
  [[132,-4],[136,-4],[140,-6],[146,-6],[148,-8],[144,-8],[138,-6],
   [134,-6],[132,-4]],

  // Madagascar
  [[44,-12],[48,-14],[50,-18],[50,-22],[46,-26],[44,-24],[42,-18],
   [44,-12]],

  // Antarctica
  [[-180,-68],[-150,-64],[-120,-64],[-90,-68],[-60,-64],[-30,-70],
   [0,-68],[30,-64],[60,-68],[90,-64],[120,-64],[150,-64],[180,-68],
   [180,-90],[-180,-90],[-180,-68]],
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function latLonToVec3(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

function proj(lon: number, lat: number, W: number, H: number) {
  return { x: (lon + 180) / 360 * W, y: (90 - lat) / 180 * H };
}

// ── Earth texture ─────────────────────────────────────────────────────────────

function createEarthTexture(): THREE.CanvasTexture {
  const W = 2048, H = 1024;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;

  // Ocean background
  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0,   "#04060f");
  ocean.addColorStop(0.5, "#060a16");
  ocean.addColorStop(1,   "#04060f");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);

  // Continent fills
  ctx.fillStyle   = "#101e30";
  ctx.strokeStyle = "#1a3050";
  ctx.lineWidth   = 1.2;

  LAND_POLYS.forEach(poly => {
    ctx.beginPath();
    poly.forEach(([lon, lat], i) => {
      const { x, y } = proj(lon, lat, W, H);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  });

  // Coastline stroke
  ctx.strokeStyle = "#1e3555";
  ctx.lineWidth   = 1.8;
  LAND_POLYS.forEach(poly => {
    ctx.beginPath();
    poly.forEach(([lon, lat], i) => {
      const { x, y } = proj(lon, lat, W, H);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  });

  // Subtle interior glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.4);
  glow.addColorStop(0,   "rgba(80,120,200,0.06)");
  glow.addColorStop(0.5, "rgba(60,100,180,0.03)");
  glow.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  LAND_POLYS.forEach(poly => {
    ctx.beginPath();
    poly.forEach(([lon, lat], i) => {
      const { x, y } = proj(lon, lat, W, H);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  });

  // Lat/Lon grid lines
  ctx.strokeStyle = "rgba(100,160,255,0.07)";
  ctx.lineWidth   = 0.6;
  for (let lat = -90; lat <= 90; lat += 30) {
    ctx.beginPath();
    ctx.moveTo(0, (90 - lat) / 180 * H);
    ctx.lineTo(W, (90 - lat) / 180 * H);
    ctx.stroke();
  }
  for (let lon = -180; lon <= 180; lon += 30) {
    ctx.beginPath();
    ctx.moveTo((lon + 180) / 360 * W, 0);
    ctx.lineTo((lon + 180) / 360 * W, H);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Dot-map overlay ──────────────────────────────────────────────────────────

function buildDotMap(group: THREE.Group): void {
  const STEP = 1.5;
  const MW = Math.round(360 / STEP);
  const MH = Math.round(180 / STEP);

  const mc = document.createElement("canvas");
  mc.width = MW; mc.height = MH;
  const mCtx = mc.getContext("2d")!;
  mCtx.fillStyle = "#000";
  mCtx.fillRect(0, 0, MW, MH);
  mCtx.fillStyle = "#fff";
  LAND_POLYS.forEach(poly => {
    mCtx.beginPath();
    poly.forEach(([lon, lat], i) => {
      const x = (lon + 180) / 360 * MW;
      const y = (90 - lat) / 180 * MH;
      if (i === 0) mCtx.moveTo(x, y); else mCtx.lineTo(x, y);
    });
    mCtx.closePath();
    mCtx.fill();
  });

  const img   = mCtx.getImageData(0, 0, MW, MH);
  const positions: THREE.Vector3[] = [];

  for (let row = 0; row < MH; row++) {
    for (let col = 0; col < MW; col++) {
      const idx = (row * MW + col) * 4;
      if ((img.data[idx] ?? 0) > 100) {
        const lon = (col + 0.5) / MW * 360 - 180;
        const lat = 90 - (row + 0.5) / MH * 180;
        positions.push(latLonToVec3(lat, lon, 1.002));
      }
    }
  }

  const geo  = new THREE.SphereGeometry(0.007, 4, 4);
  const mat  = new THREE.MeshBasicMaterial({ color: 0x2a4a7a });
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  const m4   = new THREE.Matrix4();

  positions.forEach((pos, i) => {
    m4.setPosition(pos);
    mesh.setMatrixAt(i, m4);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

// ── Component ────────────────────────────────────────────────────────────────

type Props = { className?: string; cameraZ?: number };

export function GlobeScene({ className, cameraZ = 2.7 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene  = new THREE.Scene();
    const w = container.clientWidth  || 800;
    const h = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = cameraZ;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0x8899cc, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const orangePt = new THREE.PointLight(0xf97316, 1.0, 8);
    orangePt.position.set(0, 0, 3);
    scene.add(orangePt);

    const group = new THREE.Group();
    scene.add(group);

    // Earth sphere with canvas texture
    const earthTex = createEarthTexture();
    const sphereGeo = new THREE.SphereGeometry(1, 72, 72);
    const sphereMat = new THREE.MeshPhongMaterial({
      map:       earthTex,
      bumpMap:   earthTex,
      bumpScale: 0.012,
      specular:  new THREE.Color(0x0a1a38),
      shininess: 6,
    });
    group.add(new THREE.Mesh(sphereGeo, sphereMat));

    // Atmosphere shell
    const atmoGeo = new THREE.SphereGeometry(1.035, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color:       0x0d1a4e,
      transparent: true,
      opacity:     0.14,
      depthWrite:  false,
    });
    group.add(new THREE.Mesh(atmoGeo, atmoMat));

    // Dot-map land overlay
    buildDotMap(group);

    // City nodes
    const cityPositions = CITIES.map(c => latLonToVec3(c.lat, c.lon, 1.013));
    cityPositions.forEach(pos => {
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.017, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf97316 }),
      );
      node.position.copy(pos);
      group.add(node);

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.22 }),
      );
      halo.position.copy(pos);
      group.add(halo);
    });

    // Arc lines
    const arcLineMat = new THREE.LineBasicMaterial({
      color: 0xf97316, transparent: true, opacity: 0.2,
    });
    const curves: THREE.QuadraticBezierCurve3[] = [];

    CONNECTIONS.forEach(([a, b]) => {
      const s = cityPositions[a];
      const e = cityPositions[b];
      if (!s || !e) return;
      const mid = s.clone().add(e).normalize().multiplyScalar(1.5);
      const curve = new THREE.QuadraticBezierCurve3(s, mid, e);
      curves.push(curve);
      group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)),
        arcLineMat,
      ));
    });

    // Traveling pulses
    const pulses = curves.map((curve, i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffa040 }),
      );
      group.add(mesh);
      return { mesh, curve, t: i / curves.length, speed: 0.003 + (i % 3) * 0.0015 };
    });

    // Mouse / touch interaction
    let isDragging = false, prevX = 0, prevY = 0, velX = 0, velY = 0;

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      velY += (e.clientX - prevX) * 0.005;
      velX += (e.clientY - prevY) * 0.003;
      prevX = e.clientX; prevY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };

    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      velY += (e.touches[0].clientX - prevX) * 0.005;
      velX += (e.touches[0].clientY - prevY) * 0.003;
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onMouseUp);

    // Resize
    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth, nh = container.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(container);

    // Animation loop
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);

      if (!reduced) {
        group.rotation.y += 0.0012 + velY * 0.1;
        group.rotation.x += velX * 0.1;
        velX *= 0.92; velY *= 0.92;
        group.rotation.x = Math.max(-0.6, Math.min(0.6, group.rotation.x));

        pulses.forEach(p => {
          p.t += p.speed;
          if (p.t > 1) p.t -= 1;
          p.mesh.position.copy(p.curve.getPoint(p.t));
        });

        orangePt.intensity = 1.0 + Math.sin(Date.now() * 0.002) * 0.3;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      earthTex.dispose();
      renderer.dispose();
      ro.disconnect();
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [cameraZ]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", cursor: "grab" }}
      aria-hidden="true"
    />
  );
}
