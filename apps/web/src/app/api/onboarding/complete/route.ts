import { clerkClient, auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const role = body.role === "OPERATOR" ? "OPERATOR" : "DRIVER";

    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: {
          role,
          onboardingComplete: true,
        },
      });
    } catch (clerkErr) {
      console.warn("Clerk updateUser warning:", clerkErr);
    }

    const response = NextResponse.json({ success: true, role });
    response.cookies.set("evspark_onboarded", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    response.cookies.set("evspark_role", role, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  } catch (error: any) {
    const fallbackResponse = NextResponse.json({ success: true, role: "DRIVER" });
    fallbackResponse.cookies.set("evspark_onboarded", "true", { path: "/" });
    fallbackResponse.cookies.set("evspark_role", "DRIVER", { path: "/" });
    return fallbackResponse;
  }
}
