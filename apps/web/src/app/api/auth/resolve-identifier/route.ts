import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawIdentifier = (body.identifier || "").toString().trim().toLowerCase();

    if (!rawIdentifier) {
      return NextResponse.json({ found: false, error: "Identifier is required" }, { status: 400 });
    }

    // Fast-path: if the user typed an email address, return immediately
    if (rawIdentifier.includes("@")) {
      return NextResponse.json({
        found: true,
        email: rawIdentifier,
        username: null,
        passwordEnabled: true,
        isGoogle: false,
        isGithub: false,
      });
    }

    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) {
      return NextResponse.json({ found: false, error: "Clerk secret not configured" }, { status: 500 });
    }

    // Helper to query Clerk Users API
    const fetchClerkUsers = async (params: Record<string, string>) => {
      const url = new URL("https://api.clerk.com/v1/users");
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${clerkSecret}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    };

    // Query recent users to match username stored in metadata or direct username
    const users = await fetchClerkUsers({ limit: "100" });

    const matchedUser = users.find((u: any) => {
      const usernameMeta = u.unsafe_metadata?.username?.toLowerCase();
      const publicUsernameMeta = u.public_metadata?.username?.toLowerCase();
      const directUsername = u.username?.toLowerCase();

      return (
        usernameMeta === rawIdentifier ||
        publicUsernameMeta === rawIdentifier ||
        directUsername === rawIdentifier
      );
    });

    if (!matchedUser) {
      return NextResponse.json({ found: false });
    }

    const primaryEmailObj =
      matchedUser.email_addresses?.find((e: any) => e.id === matchedUser.primary_email_address_id) ||
      matchedUser.email_addresses?.[0];
    const resolvedEmail = primaryEmailObj?.email_address || null;

    const isGoogle =
      matchedUser.external_accounts?.some((ea: any) => ea.provider === "oauth_google") ||
      matchedUser.email_addresses?.some((e: any) => e.verification?.strategy === "from_oauth_google") ||
      false;

    const isGithub =
      matchedUser.external_accounts?.some((ea: any) => ea.provider === "oauth_github") ||
      false;

    return NextResponse.json({
      found: true,
      email: resolvedEmail,
      username: matchedUser.unsafe_metadata?.username || matchedUser.username || null,
      passwordEnabled: Boolean(matchedUser.password_enabled),
      isGoogle: Boolean(isGoogle),
      isGithub: Boolean(isGithub),
    });
  } catch (error: any) {
    console.error("Resolve identifier error:", error);
    return NextResponse.json({ found: false, error: "Internal error" }, { status: 500 });
  }
}
