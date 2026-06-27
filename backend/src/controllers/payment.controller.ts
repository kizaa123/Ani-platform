import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { paymentService } from '../services/payment.service';
import { createAuditLog } from '../middleware/audit.middleware';

export class PaymentController {
  getPackages = async (_req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await paymentService.getPackages());
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  accessStatus = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await paymentService.getAccessStatus(req.user!.userId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  purchase = async (req: AuthRequest, res: Response) => {
    try {
      const result = await paymentService.purchase(req.user!.userId, req.user!.roleId, req.body);
      await createAuditLog(req, 'ACCESS_PURCHASED', 'buyer_access', { packageId: req.body.packageId });
      ApiResponse.created(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  history = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await paymentService.paymentHistory(req.user!.userId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  allPayments = async (_req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await paymentService.allPayments());
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  purchaseFarmAccess = async (req: AuthRequest, res: Response) => {
    try {
      const result = await paymentService.purchaseFarmAccess(
        req.user!.userId,
        req.user!.roleId,
        req.body
      );
      await createAuditLog(req, 'FARM_ACCESS_PURCHASED', 'buyer_farmer_access', {
        farmerId: req.body.farmerId,
      });
      ApiResponse.created(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  createPackage = async (req: AuthRequest, res: Response) => {
    try {
      const pkg = await paymentService.createPackage(req.body);
      await createAuditLog(req, 'PACKAGE_CREATED', 'access_package');
      ApiResponse.created(res, pkg);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const paymentController = new PaymentController();
