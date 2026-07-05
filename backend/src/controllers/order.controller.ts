import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { orderService } from '../services/order.service';
import { createAuditLog } from '../middleware/audit.middleware';

export class OrderController {
  purchase = async (req: AuthRequest, res: Response) => {
    try {
      const result = await orderService.purchaseProduct(
        req.user!.userId,
        req.user!.roleId,
        req.params.id as string,
        req.body
      );
      await createAuditLog(req, 'PRODUCT_PURCHASED', 'product_order', {
        listingId: req.params.id as string,
        amount: result.totalPaid,
      });
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  myOrders = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await orderService.buyerOrders(req.user!.userId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const orderController = new OrderController();
