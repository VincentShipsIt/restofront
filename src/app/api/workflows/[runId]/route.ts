import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { runId } = await params;

  try {
    const run = await getRun(runId);
    const [status, createdAt, startedAt, completedAt] = await Promise.all([
      run.status,
      run.createdAt,
      run.startedAt,
      run.completedAt,
    ]);

    return NextResponse.json({
      runId,
      status,
      createdAt: createdAt.toISOString(),
      startedAt: startedAt?.toISOString() ?? null,
      completedAt: completedAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Workflow run not found" },
      { status: 404 },
    );
  }
}
