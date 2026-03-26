import { NextResponse } from "next/server";

function getRuntimeCommitSha() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    process.env.COMMIT_SHA;

  return typeof commit === "string" && commit.trim().length > 0 ? commit.trim() : null;
}

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "fyxvo-web",
      version: "v1",
      commit: getRuntimeCommitSha(),
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}
