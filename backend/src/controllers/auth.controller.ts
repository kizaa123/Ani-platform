import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { authService } from '../services/auth.service';
import { agentService } from '../services/agent.service';
import { createAuditLog } from '../middleware/audit.middleware';

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
}

export const authController = new AuthController();
