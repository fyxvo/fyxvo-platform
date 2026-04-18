"use client";

import dynamic from "next/dynamic";
import { Globe2D } from "./globe-2d";

// GlobeScene loads only on client — Globe2D is the fallback during loading and on mobile
const GlobeScene = dynamic(
  () => import("./globe-scene").then((m) => m.GlobeScene),
  { ssr: false, loading: () => <Globe2D style={{ width: "100%", height: "100%" }} /> },
);

type Props = {
  className?: string;
  cameraZ?: number;
};

export function Globe({ className, cameraZ }: Props) {
  return (
    <div className={className} style={{ position: "relative" }}>
      {/* 3D globe — hidden on mobile via CSS */}
      <div className="absolute inset-0 hidden md:block">
        <GlobeScene className="h-full w-full" {...(cameraZ !== undefined ? { cameraZ } : {})} />
      </div>
      {/* 2D SVG fallback — shown on mobile, hidden on desktop */}
      <div className="absolute inset-0 flex items-center justify-center md:hidden">
        <Globe2D style={{ width: "80%", maxWidth: "360px", height: "auto" }} />
      </div>
    </div>
  );
}
