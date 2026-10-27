import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/auth";

export async function POST(request: Request) {
  await destroyCurrentSession();
  const url = new URL("/login", request.url);
  return NextResponse.json({ success: true, redirect: url.toString() });
}

export async function GET(request: Request) {
  await destroyCurrentSession();
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url);
}
