import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const templatesDir = path.join(process.cwd(), "public", "templates");
  try {
    const filenames = fs.readdirSync(templatesDir);
    const htmlFiles = filenames.filter((file) => file.endsWith(".html"));
    return NextResponse.json(htmlFiles);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read templates directory" },
      { status: 500 }
    );
  }
}
