import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { farmService } from '../services/farm.service';
import { createAuditLog } from '../middleware/audit.middleware';

export class FarmController {
  getProfile = async (req: AuthRequest, res: Response) => {
    try {
      const profile = await farmService.getProfile(req.user!.userId, req.user!.roleId);
      ApiResponse.success(res, profile);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const profile = await farmService.updateProfile(req.user!.userId, req.user!.roleId, req.body);
      await createAuditLog(req, 'FARM_PROFILE_UPDATED', 'farmer_profile');
      ApiResponse.success(res, profile);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  addCommodity = async (req: AuthRequest, res: Response) => {
    try {
      const commodity = await farmService.addCommodity(req.user!.userId, req.user!.roleId, req.body);
      await createAuditLog(req, 'FARMER_COMMODITY_ADDED', 'farmer_commodity');
      ApiResponse.created(res, commodity);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  listCommodities = async (req: AuthRequest, res: Response) => {
    try {
      const commodities = await farmService.listCommodities(req.user!.userId);
      ApiResponse.success(res, commodities);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  removeCommodity = async (req: AuthRequest, res: Response) => {
    try {
      await farmService.removeCommodity(req.user!.userId, req.params.id);
      await createAuditLog(req, 'FARMER_COMMODITY_REMOVED', 'farmer_commodity');
      ApiResponse.success(res, { message: 'Commodity removed' });
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  financialStatement = async (req: AuthRequest, res: Response) => {
    try {
      const statement = await farmService.getFinancialStatement(req.user!.userId, req.user!.roleId);
      ApiResponse.success(res, statement);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  orders = async (req: AuthRequest, res: Response) => {
    try {
      const orders = await farmService.getOrders(req.user!.userId, req.user!.roleId);
      ApiResponse.success(res, orders);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  updateOrderTrack = async (req: AuthRequest, res: Response) => {
    try {
      const { buyerId, listingId, trackStage } = req.body;
      const order = await farmService.updateOrderTrackForFarmer(
        req.user!.userId,
        req.user!.roleId,
        buyerId,
        listingId,
        trackStage
      );
      await createAuditLog(req, 'ORDER_TRACK_UPDATED', 'product_order');
      ApiResponse.success(res, order);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const farmController = new FarmController();
