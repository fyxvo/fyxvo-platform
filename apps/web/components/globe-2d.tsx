"use client";

// 2D SVG globe fallback — shown on mobile / when JS is slow to load.
// Uses CSS stroke-dasharray animation to simulate traveling arcs.

export function Globe2D({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const cx = 160;
  const cy = 160;
  const r = 130;

  const cities = [
    { x: 60, y: 100 },  // New York
    { x: 148, y: 80 },  // London
    { x: 160, y: 88 },  // Frankfurt
    { x: 232, y: 148 }, // Singapore
    { x: 248, y: 100 }, // Tokyo
    { x: 80, y: 178 },  // São Paulo
    { x: 252, y: 188 }, // Sydney
  ];

  const connections: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 4], [0, 5], [3, 6], [4, 6],
  ];

  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible", ...style }}
    >
      {/* Globe base */}
      <circle cx={cx} cy={cy} r={r} fill="#0d0d1a" />

      {/* Atmosphere glow */}
      <defs>
        <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#0d0d1a" stopOpacity="0" />
          <stop offset="100%" stopColor="#1a1a6e" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="orangeGlow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r + 10} fill="url(#globeGlow)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#orangeGlow)" />

      {/* Lat grid lines */}
      {[-50, -25, 0, 25, 50].map((lat) => {
        const ry = (lat / 90) * r;
        const rx = Math.sqrt(Math.max(0, r * r - ry * ry));
        return (
          <ellipse
            key={lat}
            cx={cx}
            cy={cy + ry}
            rx={rx}
            ry={rx * 0.35}
            fill="none"
            stroke="#1e2045"
            strokeWidth="0.8"
            opacity="0.6"
          />
        );
      })}

      {/* Lon grid lines */}
      {[0, 30, 60, 90, 120, 150].map((lon, i) => (
        <line
          key={lon}
          x1={cx + r * Math.cos((lon * Math.PI) / 180)}
          y1={cy - r * Math.sin((lon * Math.PI) / 180) * 0.35}
          x2={cx - r * Math.cos((lon * Math.PI) / 180)}
          y2={cy + r * Math.sin((lon * Math.PI) / 180) * 0.35}
          stroke="#1e2045"
          strokeWidth="0.8"
          opacity="0.5"
          transform={`rotate(${i * 30} ${cx} ${cy})`}
        />
      ))}

      {/* Globe outline */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2045" strokeWidth="1" />

      {/* Connection arcs */}
      {connections.map(([a, b], i) => {
        const cityA = cities[a];
        const cityB = cities[b];
        if (!cityA || !cityB) return null;
        const ax = cityA.x;
        const ay = cityA.y;
        const bx = cityB.x;
        const by = cityB.y;
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2 - 30;
        const len = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2) + 80;
        const delay = i * 0.5;
        return (
          <g key={i}>
            <path
              d={`M${ax},${ay} Q${mx},${my} ${bx},${by}`}
              fill="none"
              stroke="#f97316"
              strokeWidth="0.8"
              opacity="0.2"
            />
            <path
              d={`M${ax},${ay} Q${mx},${my} ${bx},${by}`}
              fill="none"
              stroke="#f97316"
              strokeWidth="1.5"
              opacity="0.7"
              strokeDasharray={`20 ${len}`}
              style={{
                animation: `dash-travel 3s linear ${delay}s infinite`,
              }}
            />
          </g>
        );
      })}

      {/* City nodes */}
      {cities.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="5" fill="#f97316" opacity="0.2" />
          <circle cx={c.x} cy={c.y} r="2.5" fill="#f97316" />
        </g>
      ))}

      <style>{`
        @keyframes dash-travel {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -300; }
        }
        @media (prefers-reduced-motion: reduce) {
          path[stroke-dasharray] { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}
