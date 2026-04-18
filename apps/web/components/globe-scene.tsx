"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const CITIES = [
  { lat: 40.71, lon: -74.01 }, // New York
  { lat: 51.51, lon: -0.13 },  // London
  { lat: 50.11, lon: 8.68 },   // Frankfurt
  { lat: 1.35, lon: 103.82 },  // Singapore
  { lat: 35.68, lon: 139.65 }, // Tokyo
  { lat: -23.55, lon: -46.63 },// São Paulo
  { lat: -33.87, lon: 151.21 },// Sydney
];

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 4],
  [0, 5], [3, 6], [4, 6], [1, 3], [5, 0],
];

function latLonToVec3(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

type Props = {
  className?: string;
  cameraZ?: number;
};

export function GlobeScene({ className, cameraZ = 2.7 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Scene ─────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = cameraZ;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);

    // ── Lighting ──────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x8888cc, 0.4));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const orangePt = new THREE.PointLight(0xf97316, 1.2, 8);
    orangePt.position.set(0, 0, 3);
    scene.add(orangePt);

    // ── Globe group ───────────────────────────────────────────────────
    const group = new THREE.Group();
    scene.add(group);

    // Core sphere
    const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x0d0d1a,
      emissive: 0x050510,
      specular: 0x1e1e3a,
      shininess: 25,
    });
    group.add(new THREE.Mesh(sphereGeo, sphereMat));

    // Atmosphere layers
    [
      { r: 1.03, opacity: 0.08, color: 0x3344aa },
      { r: 1.07, opacity: 0.04, color: 0x1122aa },
    ].forEach(({ r, opacity, color }) => {
      const geo = new THREE.SphereGeometry(r, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.FrontSide,
        depthWrite: false,
      });
      group.add(new THREE.Mesh(geo, mat));
    });

    // Grid lines
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x1e2045,
      transparent: true,
      opacity: 0.5,
    });
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts: THREE.Vector3[] = [];
      for (let lon = 0; lon <= 361; lon += 4) pts.push(latLonToVec3(lat, lon, 1.001));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lon = 0; lon < 360; lon += 20) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 4) pts.push(latLonToVec3(lat, lon, 1.001));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // City nodes
    const cityPositions = CITIES.map((c) => latLonToVec3(c.lat, c.lon, 1.012));
    cityPositions.forEach((pos) => {
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf97316 }),
      );
      node.position.copy(pos);
      group.add(node);

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.22 }),
      );
      halo.position.copy(pos);
      group.add(halo);
    });

    // Static arc lines (faint)
    const arcLineMat = new THREE.LineBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.18,
    });
    const curves: THREE.QuadraticBezierCurve3[] = [];
    CONNECTIONS.forEach(([a, b]) => {
      const s = cityPositions[a];
      const e = cityPositions[b];
      if (!s || !e) return;
      const mid = s.clone().add(e).normalize().multiplyScalar(1.5);
      const curve = new THREE.QuadraticBezierCurve3(s, mid, e);
      curves.push(curve);
      const pts = curve.getPoints(60);
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), arcLineMat));
    });

    // Traveling pulses along arcs
    const pulseMeshes: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; t: number; speed: number }[] = [];
    const pulseBaseMat = new THREE.MeshBasicMaterial({ color: 0xffa040 });

    curves.forEach((curve, i) => {
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 6, 6),
        pulseBaseMat.clone(),
      );
      group.add(pulse);
      pulseMeshes.push({
        mesh: pulse,
        curve,
        t: (i / curves.length),
        speed: 0.003 + (i % 3) * 0.0015,
      });
    });

    // ── Mouse interaction ─────────────────────────────────────────────
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let velX = 0;
    let velY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      velY += (e.clientX - prevX) * 0.005;
      velX += (e.clientY - prevY) * 0.003;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Touch support
    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      isDragging = true;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      velY += (e.touches[0].clientX - prevX) * 0.005;
      velX += (e.touches[0].clientY - prevY) * 0.003;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onMouseUp);

    // Resize
    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(container);

    // ── Animation loop ─────────────────────────────────────────────────
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);

      if (!reduced) {
        group.rotation.y += 0.0012 + velY * 0.1;
        group.rotation.x += velX * 0.1;
        velX *= 0.92;
        velY *= 0.92;
        // Clamp X rotation
        group.rotation.x = Math.max(-0.6, Math.min(0.6, group.rotation.x));

        pulseMeshes.forEach((p) => {
          p.t += p.speed;
          if (p.t > 1) p.t -= 1;
          const pos = p.curve.getPoint(p.t);
          p.mesh.position.copy(pos);
        });

        // Pulse glow cycle on halos
        const t = Date.now() * 0.002;
        orangePt.intensity = 1.0 + Math.sin(t) * 0.3;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
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
