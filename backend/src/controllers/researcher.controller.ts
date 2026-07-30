import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { researcherService } from '../services/researcher.service';

export class ResearcherController {
  myPublications = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.myPublications(req.user!.userId, req.user!.roleId);
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  browse = async (req: AuthRequest, res: Response) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const data = await researcherService.browsePublications(req.user!.userId, q);
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  browsePublishers = async (req: AuthRequest, res: Response) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const data = await researcherService.browsePublishers(req.user!.userId, q);
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  getPublisherLibrary = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.getPublisherLibrary(
        req.user!.userId,
        req.params.publisherId as string
      );
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.getPublication(
        req.user!.userId,
        req.user!.roleId,
        req.params.id as string
      );
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const pub = await researcherService.createPublication(req.user!.userId, req.user!.roleId, req.body);
      ApiResponse.success(res, pub, 201);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const pub = await researcherService.updatePublication(
        req.user!.userId,
        req.user!.roleId,
        req.params.id as string,
        req.body
      );
      ApiResponse.success(res, pub);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.deletePublication(
        req.user!.userId,
        req.user!.roleId,
        req.params.id as string
      );
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  recordView = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.recordView(req.user!.userId, req.params.id as string);
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  purchase = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.purchasePublication(
        req.user!.userId,
        req.user!.roleId,
        req.params.id as string,
        req.body
      );
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  financialStatement = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.getFinancialStatement(req.user!.userId, req.user!.roleId);
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.updateProfile(req.user!.userId, req.user!.roleId, req.body);
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  listClients = async (req: AuthRequest, res: Response) => {
    try {
      const clients = await researcherService.listClients(req.user!.userId, req.user!.roleId);
      ApiResponse.success(res, clients);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  notifyClient = async (req: AuthRequest, res: Response) => {
    try {
      const result = await researcherService.notifyClient(req.user!.userId, req.user!.roleId, req.body);
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  toggleLike = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.toggleLike(req.params.id as string, req.user!.userId);
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  share = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.recordShare(req.params.id as string);
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  listComments = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.listComments(req.params.id as string);
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  addComment = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.addComment(
        req.params.id as string,
        req.user!.userId,
        req.body
      );
      ApiResponse.success(res, data, 201);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  document = async (req: AuthRequest, res: Response) => {
    try {
      const result = await researcherService.getPublicationDocument(
        req.user!.userId,
        req.params.id as string
      );
      if (result.kind === 'redirect') {
        res.redirect(302, result.url);
        return;
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      res.send(result.buffer);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  publicationPolicyStatus = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.getPublicationPolicyStatus(
        req.user!.userId,
        req.user!.roleId
      );
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  acceptPublicationPolicy = async (req: AuthRequest, res: Response) => {
    try {
      const data = await researcherService.acceptPublicationPolicy(
        req.user!.userId,
        req.user!.roleId
      );
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const researcherController = new ResearcherController();
