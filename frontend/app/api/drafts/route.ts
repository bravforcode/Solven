import { NextResponse } from "next/server";
import { listDrafts } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listDrafts());
}
