import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../middleware/audit.middleware';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import {
  adService,
  AD_PLACEMENTS,
  type AdPlacementKey,
} from '../services/ad.service';

export class AdController {
  listForUser = async (req: AuthRequest, res: Response) => {
    try {
      const placement = String(req.query.placement ?? '').toLowerCase();
      if (!AD_PLACEMENTS.includes(placement as AdPlacementKey)) {
        throw new AppError(400, 'Invalid placement');
      }
      const ads = await adService.listActiveForUser(placement as AdPlacementKey, req.user!.roleId);
      ApiResponse.success(res, ads);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  listAll = async (_req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await adService.listAll());
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await adService.getById(req.params.id as string));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const ad = await adService.create(req.body);
      await createAuditLog(req, 'AD_CREATED', 'ads', { adId: ad.id, placement: ad.placement });
      ApiResponse.success(res, ad, 201);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const ad = await adService.update(req.params.id as string, req.body);
      await createAuditLog(req, 'AD_UPDATED', 'ads', { adId: ad.id });
      ApiResponse.success(res, ad);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const result = await adService.remove(req.params.id as string);
      await createAuditLog(req, 'AD_DELETED', 'ads', { adId: req.params.id });
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const adController = new AdController();
