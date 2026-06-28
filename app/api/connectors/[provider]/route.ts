import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_PROVIDERS,
  isOauthProvider,
  redirectUri,
} from "../oauth-providers";

// Start the connector OAuth dance: redirect the user to the provider's consent
// screen. A random `state` is stored in an httpOnly cookie and checked on the
// way back (CSRF). Attribution to the signed-in user happens in the callback
// via the Convex auth cookie.
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  if (!isOauthProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const cfg = OAUTH_PROVIDERS[provider];
  const clientId = process.env[cfg.clientIdEnv];
  if (!clientId) {
    return NextResponse.json(
      { error: `Missing ${cfg.clientIdEnv}. Create an OAuth app and set it.` },
      { status: 500 },
    );
  }

  const origin = new URL(req.url).origin;
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(origin, provider),
    response_type: "code",
    scope: cfg.scopes.join(" "),
    state,
    ...cfg.extraAuthParams,
  });

  const res = NextResponse.redirect(`${cfg.authorizeUrl}?${params.toString()}`);
  res.cookies.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
