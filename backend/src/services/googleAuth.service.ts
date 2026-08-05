import { OAuth2Client } from 'google-auth-library';
import prisma from '../database/prisma';
import { AppError } from '../utils/errors';
import { getFrontendBaseUrl, getGoogleOAuthConfig } from '../config/google.config';
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
} from '../utils/jwt';
import { ROLES } from '../constants/roles';

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  emailVerifiedByGoogle: boolean;
}

function buildOAuthClient() {
  const config = getGoogleOAuthConfig();
  if (!config.enabled) {
    throw new AppError(
      503,
      'Google sign-in is currently unavailable.',
      'GOOGLE_NOT_CONFIGURED'
    );
  }
  return new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
}

function sanitizeAuthUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: number;
  verificationStatus: string;
  emailVerified: boolean;
  profileComplete: boolean;
  googleId?: string | null;
  role: { roleName: string };
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || undefined,
    role: user.role.roleName,
    roleId: user.roleId,
    verificationStatus: user.verificationStatus,
    emailVerified: user.emailVerified,
    profileComplete: user.profileComplete,
    hasGoogleAuth: Boolean(user.googleId),
  };
}

async function issueAuthTokens(user: {
  id: string;
  email: string;
  roleId: number;
}) {
  const tokenPayload = { userId: user.id, email: user.email, roleId: user.roleId };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  await storeRefreshToken(user.id, refreshToken);
  return { accessToken, refreshToken };
}

function buildCallbackRedirect(params: Record<string, string>) {
  const frontend = getFrontendBaseUrl();
  const query = new URLSearchParams(params).toString();
  return `${frontend}/auth/callback?${query}`;
}

export class GoogleAuthService {
  getAuthorizationUrl() {
    const client = buildOAuthClient();
    const config = getGoogleOAuthConfig();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['openid', 'email', 'profile'],
      include_granted_scopes: true,
      redirect_uri: config.redirectUri,
    });
  }

  async handleCallback(code: string) {
    const client = buildOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) {
      throw new AppError(400, 'Google did not return an ID token');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: getGoogleOAuthConfig().clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new AppError(400, 'Google profile is missing required fields');
    }

    const profile: GoogleProfile = {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      firstName: payload.given_name || payload.name?.split(' ')[0] || 'User',
      lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
      profilePicture: payload.picture,
      emailVerifiedByGoogle: payload.email_verified === true,
    };

    return this.authenticateProfile(profile);
  }

  async authenticateProfile(profile: GoogleProfile) {
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.googleId }, { email: profile.email }],
      },
      include: { role: true },
    });

    if (user && !user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          profilePicture: user.profilePicture || profile.profilePicture,
        },
        include: { role: true },
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName: profile.firstName,
          lastName: profile.lastName || profile.firstName,
          email: profile.email,
          googleId: profile.googleId,
          profilePicture: profile.profilePicture,
          roleId: ROLES.BUYER,
          profileComplete: false,
          emailVerified: true,
          phone: '',
          country: '',
          region: '',
          city: '',
          passwordHash: null,
        },
        include: { role: true },
      });
    } else if (!user.isActive) {
      throw new AppError(403, 'Account is deactivated. Contact an administrator.');
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: profile.firstName || user.firstName,
          lastName: profile.lastName || user.lastName,
          profilePicture: profile.profilePicture || user.profilePicture,
        },
        include: { role: true },
      });
    }

    const tokens = await issueAuthTokens(user);
    const redirectUrl = buildCallbackRedirect({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      needsProfile: user.profileComplete ? 'false' : 'true',
      needsEmailVerification: 'false',
    });

    return {
      redirectUrl,
      user: sanitizeAuthUser(user),
      ...tokens,
      needsProfile: !user.profileComplete,
      needsEmailVerification: false,
    };
  }

  async devSignIn(input: { email: string; firstName: string; lastName?: string }) {
    const config = getGoogleOAuthConfig();
    if (!config.devMode) {
      throw new AppError(
        403,
        'Google sign-in is currently unavailable.',
        'GOOGLE_DEV_DISABLED'
      );
    }

    const email = input.email?.trim().toLowerCase();
    const firstName = input.firstName?.trim();
    if (!email || !firstName) {
      throw new AppError(400, 'Email and first name are required', 'VALIDATION_ERROR');
    }

    const profile: GoogleProfile = {
      googleId: `dev-${email}`,
      email,
      firstName,
      lastName: input.lastName?.trim() || 'DevUser',
      profilePicture: null,
      emailVerifiedByGoogle: false,
    };

    return this.authenticateProfile(profile);
  }
}

export const googleAuthService = new GoogleAuthService();
