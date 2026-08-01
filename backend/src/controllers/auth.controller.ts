import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { authService } from '../services/auth.service';
import { agentService } from '../services/agent.service';
import { googleAuthService } from '../services/googleAuth.service';
import { emailVerificationService } from '../services/emailVerification.service';
import { getFrontendBaseUrl, getGoogleOAuthConfig } from '../config/google.config';
import { createAuditLog } from '../middleware/audit.middleware';
import { AppError } from '../utils/errors';
import { toAppError } from '../utils/prisma-errors';

function redirectGoogleOAuthError(res: Response, error: unknown) {
  const base = getFrontendBaseUrl();
  const message = toAppError(error).message;
  return res.redirect(`${base}/register?error=${encodeURIComponent(message)}`);
}

export class AuthController {
  listHandlers = async (req: AuthRequest, res: Response) => {
    try {
      const type = req.params.type === 'buyer' ? 'buyer' : 'farmer';
      ApiResponse.success(res, await agentService.listHandlers(type));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  register = async (req: AuthRequest, res: Response) => {
    try {
      const result = await authService.register(req.body);
      await createAuditLog(req, 'USER_REGISTERED', 'users', { userId: result.user.id });
      ApiResponse.created(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  login = async (req: AuthRequest, res: Response) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      await createAuditLog(req, 'USER_LOGIN', 'users', { userId: result.user.id });
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  refresh = async (req: AuthRequest, res: Response) => {
    try {
      const result = await authService.refresh(req.body.refreshToken);
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  logout = async (req: AuthRequest, res: Response) => {
    try {
      await authService.logout(req.body.refreshToken);
      await createAuditLog(req, 'USER_LOGOUT', 'users');
      ApiResponse.success(res, { message: 'Logged out' });
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  me = async (req: AuthRequest, res: Response) => {
    try {
      const profile = await authService.getProfile(req.user!.userId);
      ApiResponse.success(res, profile);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const profile = await authService.updateUserProfile(req.user!.userId, req.body);
      await createAuditLog(req, 'USER_PROFILE_UPDATED', 'users');
      ApiResponse.success(res, profile);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  updateHandler = async (req: AuthRequest, res: Response) => {
    try {
      const assignment = await authService.updateAssignedHandler(
        req.user!.userId,
        req.user!.roleId,
        req.body.handlerId
      );
      await createAuditLog(req, 'HANDLER_UPDATED', 'agent_assignment');
      ApiResponse.success(res, assignment);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  googleStart = async (_req: AuthRequest, res: Response) => {
    try {
      const config = getGoogleOAuthConfig();
      if (!config.enabled) {
        const base = getFrontendBaseUrl();
        const message =
          'Google sign-in is currently unavailable. Please register with email.';
        return res.redirect(`${base}/register?error=${encodeURIComponent(message)}`);
      }
      return res.redirect(googleAuthService.getAuthorizationUrl());
    } catch (e) {
      if (!(e instanceof AppError)) {
        console.error('Google OAuth start failed:', e);
      }
      return redirectGoogleOAuthError(res, e);
    }
  };

  googleCallback = async (req: AuthRequest, res: Response) => {
    try {
      const oauthError = typeof req.query.error === 'string' ? req.query.error : '';
      if (oauthError) {
        throw new AppError(
          400,
          oauthError === 'access_denied'
            ? 'Google sign-in was cancelled'
            : 'Google sign-in could not be completed. Please try again.',
          'GOOGLE_OAUTH_ERROR'
        );
      }

      const code = typeof req.query.code === 'string' ? req.query.code : '';
      if (!code) {
        throw new AppError(400, 'Google sign-in could not be completed. Please try again.', 'GOOGLE_OAUTH_ERROR');
      }
      const result = await googleAuthService.handleCallback(code);
      await createAuditLog(req, 'USER_GOOGLE_LOGIN', 'users', { userId: result.user.id });
      return res.redirect(result.redirectUrl);
    } catch (e) {
      if (!(e instanceof AppError)) {
        console.error('Google OAuth callback failed:', e);
      }
      return redirectGoogleOAuthError(res, e);
    }
  };

  googleDev = async (req: AuthRequest, res: Response) => {
    try {
      const result = await googleAuthService.devSignIn(req.body);
      await createAuditLog(req, 'USER_GOOGLE_DEV_LOGIN', 'users', { userId: result.user.id });
      ApiResponse.success(res, {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        needsProfile: result.needsProfile,
        needsEmailVerification: result.needsEmailVerification,
      });
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  sendEmailVerification = async (req: AuthRequest, res: Response) => {
    try {
      const profile = await authService.getProfile(req.user!.userId);
      const email = req.body.email?.trim().toLowerCase() || profile.email;
      if (email !== profile.email) {
        throw new AppError(400, 'Email must match your account email', 'VALIDATION_ERROR');
      }
      const result = await emailVerificationService.sendChallenge(email);
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  verifyEmailChallenge = async (req: AuthRequest, res: Response) => {
    try {
      const profile = await authService.getProfile(req.user!.userId);
      const email = req.body.email?.trim().toLowerCase() || profile.email;
      await emailVerificationService.verifyChallenge(
        email,
        req.body.challengeId,
        req.body.code
      );
      await authService.markEmailVerified(req.user!.userId);
      ApiResponse.success(res, { verified: true });
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  completeProfile = async (req: AuthRequest, res: Response) => {
    try {
      const result = await authService.completeProfile(req.user!.userId, req.body);
      await createAuditLog(req, 'USER_PROFILE_COMPLETED', 'users', { userId: result.user.id });
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const authController = new AuthController();
