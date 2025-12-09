import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing template ID" }, { status: 400 });
  }

  // Basic security check to prevent directory traversal
  if (id.includes("..")) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "templates", id);

  try {
    const html = fs.readFileSync(filePath, "utf-8");
    return NextResponse.json({ html });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to read template file" },
      { status: 500 }
    );
  }
}
