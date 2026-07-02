import crypto from 'node:crypto';
import { parseCookies, cookie, safeReturnPath } from '../../_lib/http.js';
import { encryptSecret } from '../../_lib/crypto.js';
import { saveLinkedInConnection } from '../../_lib/supabase.js';

function stateSecret() {
  return process.env.TOKEN_ENCRYPTION_KEY || process.env.LINKEDIN_CLIENT_SECRET;
}

function safeOrigin(value) {
  try {
    const url = new URL(String(value || ''));

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error();
    }

    return url.origin;
  } catch {
    throw new Error(
      'LinkedIn return address was invalid. Please reconnect LinkedIn.'
    );
  }
}

function verifySignedState(value) {
  if (typeof value !== 'string' || !value.includes('.')) {
    throw new Error(
      'LinkedIn connection security check failed. Please try again.'
    );
  }

  const [encoded, providedSignature] = value.split('.');

  if (!encoded || !providedSignature) {
    throw new Error(
      'LinkedIn connection security check failed. Please try again.'
    );
  }

  const secret = stateSecret();

  if (!secret) {
    throw new Error('LinkedIn security configuration is missing.');
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    throw new Error(
      'LinkedIn connection security check failed. Please try again.'
    );
  }

  let payload;

  try {
    payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    );
  } catch {
    throw new Error(
      'LinkedIn connection security check failed. Please try again.'
    );
  }

  const age = Date.now() - Number(payload.issuedAt || 0);

  if (!payload.issuedAt || age < 0 || age > 15 * 60 * 1000) {
    throw new Error(
      'LinkedIn connection expired. Please reconnect LinkedIn.'
    );
  }

  if (!payload.userId || !payload.workspaceId) {
    throw new Error(
      'LinkedIn connection was not linked to a PicPlanr account. Please try again.'
    );
  }

  return {
    returnTo: safeReturnPath(
      payload.returnTo || '/?linkedin=connected'
    ),
    origin: safeOrigin(payload.origin),
    userId: String(payload.userId),
    workspaceId: String(payload.workspaceId)
  };
}

async function exchangeCode(code) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('LinkedIn connection is not fully configured.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  });

  const response = await fetch(
    'https://www.linkedin.com/oauth/v2/accessToken',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    }
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error('LinkedIn token response:', data);

    throw new Error(
      data.error_description ||
      data.message ||
      'LinkedIn could not issue an access token.'
    );
  }

  return {
    accessToken: data.access_token,
    expiresIn: Number(data.expires_in || 0),
    refreshToken: data.refresh_token || null,
    refreshTokenExpiresIn: Number(
      data.refresh_token_expires_in || 0
    )
  };
}

async function getProfile(accessToken) {
  const response = await fetch(
    'https://api.linkedin.com/v2/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const profile = await response.json();

  if (!response.ok || !profile.sub) {
    console.error('LinkedIn profile response:', profile);

    throw new Error(
      profile.message ||
      'LinkedIn profile information could not be retrieved.'
    );
  }

  return profile;
}

function popupResponse(
  res,
  { origin, returnTo, status, message = '' }
) {
  const payload =
    status === 'connected'
      ? { type: 'picplanr-linkedin-connected' }
      : {
          type: 'picplanr-linkedin-error',
          message
        };

  const separator = returnTo.includes('?') ? '&' : '?';

  const fallbackUrl =
    `${origin}${returnTo}${separator}` +
    `linkedin_status=${status}` +
    `${message ? `&message=${encodeURIComponent(message)}` : ''}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Returning to PicPlanr</title>
  <style>
    body{
      margin:0;
      background:#070b14;
      color:#fff;
      font-family:Arial,sans-serif;
      display:grid;
      place-items:center;
      min-height:100vh
    }
    main{
      max-width:460px;
      padding:32px;
      text-align:center
    }
    h1{
      font-size:28px;
      margin:0 0 12px
    }
    p{
      color:#aeb8d2;
      line-height:1.5
    }
  </style>
</head>
<body>
  <main>
    <h1>${
      status === 'connected'
        ? 'LinkedIn connected'
        : 'LinkedIn connection failed'
    }</h1>
    <p>${
      status === 'connected'
        ? 'Returning you to PicPlanr now.'
        : 'You can return to PicPlanr and try again.'
    }</p>
  </main>

  <script>
    const payload=${JSON.stringify(payload)};
    const origin=${JSON.stringify(origin)};
    const fallback=${JSON.stringify(fallbackUrl)};

    try{
      if(window.opener && !window.opener.closed){
        window.opener.postMessage(payload,origin);
        window.opener.focus();
        setTimeout(()=>window.close(),350);
      }else{
        window.location.replace(fallback);
      }
    }catch{
      window.location.replace(fallback);
    }
  </script>
</body>
</html>`);
}

export default async function handler(req, res) {
  const cookies = parseCookies(req);

  let returnTo = safeReturnPath(
    cookies.pp_li_return || '/?linkedin=connected'
  );

  let origin = 'https://www.picplanrapp.com';

  try {
    if (req.query?.error) {
      throw new Error(
        req.query.error_description || req.query.error
      );
    }

    if (!req.query?.code) {
      throw new Error(
        'LinkedIn did not return an authorisation code.'
      );
    }

    const verified = verifySignedState(
      String(req.query?.state || '')
    );

    returnTo = verified.returnTo;
    origin = verified.origin;

    const token = await exchangeCode(
      String(req.query.code)
    );

    const profile = await getProfile(token.accessToken);
    const id = crypto.randomUUID();

    const expiresAt = token.expiresIn
      ? new Date(
          Date.now() + token.expiresIn * 1000
        ).toISOString()
      : null;

    const refreshTokenExpiresAt =
      token.refreshTokenExpiresIn
        ? new Date(
            Date.now() +
            token.refreshTokenExpiresIn * 1000
          ).toISOString()
        : null;

    await saveLinkedInConnection({
      id,
      user_id: verified.userId,
      workspace_id: verified.workspaceId,
      provider: 'linkedin',
      provider_account_id: String(profile.sub),
      provider_account_name:
        profile.name ||
        profile.given_name ||
        'LinkedIn account',
      encrypted_access_token:
        encryptSecret(token.accessToken),
      encrypted_refresh_token:
        token.refreshToken
          ? encryptSecret(token.refreshToken)
          : null,
      token_expires_at: expiresAt,
      status: 'connected',
      metadata: {
        email: profile.email || null,
        email_verified:
          profile.email_verified ?? null,
        picture: profile.picture || null,
        locale: profile.locale || null,
        refresh_token_expires_at:
          refreshTokenExpiresAt
      }
    });

    res.setHeader('Set-Cookie', [
      cookie('pp_li_connection', id, {
        maxAge: 60 * 60 * 24 * 30
      }),
      cookie('pp_li_state', '', { maxAge: 0 }),
      cookie('pp_li_return', '', { maxAge: 0 })
    ]);

    return popupResponse(res, {
      origin,
      returnTo,
      status: 'connected'
    });
  } catch (error) {
    console.error(error);

    res.setHeader('Set-Cookie', [
      cookie('pp_li_state', '', { maxAge: 0 }),
      cookie('pp_li_return', '', { maxAge: 0 })
    ]);

    return popupResponse(res, {
      origin,
      returnTo,
      status: 'error',
      message:
        error.message ||
        'LinkedIn could not be connected.'
    });
  }
}
