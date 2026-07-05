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
}

export const researcherController = new ResearcherController();
