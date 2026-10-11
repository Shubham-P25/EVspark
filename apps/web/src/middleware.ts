import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/classic",
  "/login(.*)",
  "/register(.*)",
  "/api/webhooks(.*)",
  "/unauthorized(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isDriverRoute = createRouteMatcher(["/driver(.*)"]);
const isOperatorRoute = createRouteMatcher(["/station(.*)", "/operator(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // If user is not signed in and trying to access a protected route -> redirect to /login
  if (!userId && !isPublicRoute(req)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // If signed in, check onboarding and roles
  if (userId) {
    const metadata = (sessionClaims?.metadata as Record<string, unknown>) || {};
    const cookieOnboarded =
      req.cookies.get("evspark_onboarded")?.value === "true" ||
      req.cookies.get("evspark_onboarding_complete")?.value === "true";
    const cookieRole = req.cookies.get("evspark_role")?.value?.toUpperCase();

    const onboardingComplete =
      Boolean(metadata.onboardingComplete) ||
      cookieOnboarded ||
      Boolean((sessionClaims as any)?.publicMetadata?.onboardingComplete);
    const role = (metadata.role as string)?.toUpperCase() || cookieRole || "DRIVER";

    // If onboarded and visiting /onboarding -> redirect straight to dashboard
    if (onboardingComplete && isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL(role === "OPERATOR" ? "/station" : "/driver", req.url));
    }

    // Not onboarded and not on public route and not on /onboarding -> redirect to /onboarding
    if (!onboardingComplete && !isOnboardingRoute(req) && !isPublicRoute(req)) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Role-based route authorization
    if (onboardingComplete) {
      if (isDriverRoute(req) && role && role !== "DRIVER" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      if (isOperatorRoute(req) && role && role !== "OPERATOR" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      if (isAdminRoute(req) && role && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
