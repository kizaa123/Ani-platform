function resolveApiBase(): string {
  const configured = process.env.API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderUrl) return renderUrl.replace(/\/$/, '');

  return `http://localhost:${process.env.PORT || 3001}`;
}

const API_BASE = resolveApiBase();

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() || `${API_BASE}/api/auth/google/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    enabled: Boolean(clientId && clientSecret),
    devMode: process.env.GOOGLE_DEV_MODE === 'true' || (!clientId && process.env.NODE_ENV !== 'production'),
  };
}

export function getFrontendBaseUrl() {
  const configured = process.env.FRONTEND_URL?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];
  return configured[0] || 'http://localhost:3000';
}
