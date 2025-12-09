import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

const PUBLIC_PATH_PREFIXES = ["/_next", "/api/", "/templates", "/images", "/fonts"];
const PUBLIC_PATHS = new Set([
  "/login",
  "/favicon.ico",
  "/api/auth/login",
  "/api/auth/logout",
]);

const STATIC_EXT = /\.(png|jpg|jpeg|gif|svg|webp|ico|txt|json|xml|css|js|map)$/i;

function isPublicPath(pathname: string) {
  if (pathname === "/") return false;
  if (STATIC_EXT.test(pathname)) return true;
  if (PUBLIC_PATHS.has(pathname)) return true;
  for (const prefix of PUBLIC_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  for (const base of PUBLIC_PATHS) {
    if (pathname.startsWith(`${base}/`)) return true;
  }
  return false;
}

function isHtmlRequest(req: NextRequest) {
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) return true;
  const pathname = req.nextUrl.pathname;
  const hasExt = /\.[a-zA-Z0-9]+$/.test(pathname);
  return !hasExt && !pathname.startsWith("/api/");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;

  if (pathname.startsWith("/login")) {
    if (token) {
      const dest = req.nextUrl.searchParams.get("redirect");
      const target = dest && dest.startsWith("/") ? dest : "/";
      return NextResponse.redirect(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!isHtmlRequest(req)) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    const target = `${pathname}${req.nextUrl.search || ""}`;
    loginUrl.searchParams.set("redirect", target || "/");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default middleware;

export const config = {
  matcher: ["/:path*"],
};
