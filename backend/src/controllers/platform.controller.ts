import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { connectionService } from '../services/connection.service';
import { agentService } from '../services/agent.service';
import { chatService } from '../services/chat.service';
import { notificationService } from '../services/notification.service';
import { adminService, verifyUserSchema } from '../services/admin.service';
import { createAuditLog } from '../middleware/audit.middleware';
import {
  matchingService,
  assistantService,
  diseaseDetectionService,
  pricePredictionService,
} from '../ai';

export class ConnectionController {
  create = async (req: AuthRequest, res: Response) => {
    try {
      const connection = await connectionService.create(req.user!.userId, req.body);
      await createAuditLog(req, 'CONNECTION_REQUESTED', 'connection_request');
      ApiResponse.created(res, connection);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  list = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await connectionService.listForUser(req.user!.userId, req.user!.roleId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  updateStatus = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await connectionService.updateStatus(
        req.params.id as string,
        req.user!.userId,
        req.user!.roleId,
        req.body.status
      );
      await createAuditLog(req, `CONNECTION_${req.body.status}`, 'connection_request');
      ApiResponse.success(res, updated);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export class AgentController {
  profile = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await agentService.getProfile(req.user!.userId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  assignments = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await agentService.getAssignments(req.user!.userId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  clientFarm = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(
        res,
        await agentService.getClientFarm(
          req.user!.userId,
          req.user!.roleId,
          req.params.ownerId as string
        )
      );
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  clientOrders = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(
        res,
        await agentService.getClientOrders(
          req.user!.userId,
          req.user!.roleId,
          req.params.ownerId as string
        )
      );
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  updateClientOrderTrack = async (req: AuthRequest, res: Response) => {
    try {
      const { buyerId, listingId, trackStage } = req.body;
      const order = await agentService.updateClientOrderTrack(
          req.user!.userId,
          req.user!.roleId,
          req.params.ownerId as string,
          buyerId,
          listingId,
          trackStage
      );
      ApiResponse.success(res, order);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  clientFinancialStatement = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(
        res,
        await agentService.getClientFinancialStatement(
          req.user!.userId,
          req.user!.roleId,
          req.params.ownerId as string
        )
      );
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  clientConnections = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(
        res,
        await agentService.getClientConnections(
          req.user!.userId,
          req.user!.roleId,
          req.params.ownerId as string
        )
      );
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  createAssignment = async (req: AuthRequest, res: Response) => {
    try {
      const assignment = await agentService.createAssignment(
        req.user!.userId,
        req.user!.roleId,
        req.body.ownerId
      );
      await createAuditLog(req, 'AGENT_ASSIGNMENT_CREATED', 'agent_assignment');
      ApiResponse.created(res, assignment);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  removeAssignment = async (req: AuthRequest, res: Response) => {
    try {
      await agentService.removeAssignment(req.user!.userId, req.params.id as string);
      ApiResponse.success(res, { message: 'Assignment removed' });
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export class ChatController {
  send = async (req: AuthRequest, res: Response) => {
    try {
      const msg = await chatService.send(req.user!.userId, req.user!.roleId, req.body);
      ApiResponse.created(res, msg);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  conversation = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(
        res,
        await chatService.getConversation(req.user!.userId, req.user!.roleId, req.params.partnerId as string)
      );
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export class NotificationController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await notificationService.listForUser(req.user!.userId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  unreadCount = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await notificationService.unreadCount(req.user!.userId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  markRead = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(
        res,
        await notificationService.markRead(req.params.id as string, req.user!.userId)
      );
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  markAllRead = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await notificationService.markAllRead(req.user!.userId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export class AdminController {
  stats = async (_req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await adminService.getStats());
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  pendingUsers = async (_req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await adminService.getPendingUsers());
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  listUsers = async (req: AuthRequest, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const roleId = req.query.roleId ? parseInt(req.query.roleId as string, 10) : undefined;
      const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED'];
      const filters: { status?: 'PENDING' | 'VERIFIED' | 'REJECTED'; roleId?: number } = {};
      if (status && validStatuses.includes(status)) {
        filters.status = status as 'PENDING' | 'VERIFIED' | 'REJECTED';
      }
      if (roleId && !Number.isNaN(roleId)) {
        filters.roleId = roleId;
      }
      ApiResponse.success(res, await adminService.getVerifiableUsers(filters));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  verifyUser = async (req: AuthRequest, res: Response) => {
    try {
      const user = await adminService.verifyUser(req.params.id as string, req.body.status);
      await createAuditLog(req, `USER_${req.body.status}`, 'users');
      ApiResponse.success(res, user);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  auditLogs = async (_req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await adminService.getAuditLogs());
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export class AiController {
  matches = async (req: AuthRequest, res: Response) => {
    try {
      const commodityId = req.query.commodityId ? parseInt(req.query.commodityId as string) : undefined;
      ApiResponse.success(res, await matchingService.findMatches(req.user!.userId, commodityId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  assistant = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await assistantService.ask(req.user!.userId, req.body.question));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  diseaseDetection = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await diseaseDetectionService.analyzeImage(req.body.imageUrl));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  pricePrediction = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await pricePredictionService.predict(req.body.commodityId, req.body.region));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const connectionController = new ConnectionController();
export const agentController = new AgentController();
export const chatController = new ChatController();
export const notificationController = new NotificationController();
export const adminController = new AdminController();
export const aiController = new AiController();
