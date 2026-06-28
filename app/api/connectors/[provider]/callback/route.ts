import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import {
  OAUTH_PROVIDERS,
  isOauthProvider,
  redirectUri,
} from "../../oauth-providers";

// OAuth callback: verify state, exchange the code for tokens, read the account
// email, and record the connector for the signed-in user (attributed via the
// Convex auth cookie). Tokens themselves aren't persisted yet — storing +
// refreshing them for real contact/calendar reads is the next step (TODO).
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const back = `${url.origin}/connectors`;

  if (!isOauthProvider(provider)) {
    return NextResponse.redirect(`${back}?error=unknown_provider`);
  }
  const cfg = OAUTH_PROVIDERS[provider];

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get(`oauth_state_${provider}`)?.value;
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${back}?error=bad_state`);
  }

  const clientId = process.env[cfg.clientIdEnv];
  const clientSecret = process.env[cfg.clientSecretEnv];
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${back}?error=missing_credentials`);
  }

  try {
    // 1. code → tokens
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(url.origin, provider),
      }),
    });
    if (!tokenRes.ok) throw new Error("token_exchange_failed");
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) throw new Error("no_access_token");

    // 2. read the account email
    const infoRes = await fetch(cfg.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = (await infoRes.json()) as Record<string, unknown>;
    const email = cfg.emailField(info) ?? `${provider} account`;

    // 3. attribute to the signed-in user and record the connector
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error("missing_convex_url");
    const client = new ConvexHttpClient(convexUrl);
    const token = await convexAuthNextjsToken();
    if (!token) return NextResponse.redirect(`${back}?error=not_signed_in`);
    client.setAuth(token);
    await client.mutation(api.connectors.connectOauth, {
      provider,
      accountEmail: email,
      label: email,
    });

    const res = NextResponse.redirect(`${back}?connected=${provider}`);
    res.cookies.delete(`oauth_state_${provider}`);
    return res;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(`${back}?error=${reason}`);
  }
}
