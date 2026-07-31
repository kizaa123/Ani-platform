import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { orderService } from '../services/order.service';
import {
  generateOrderStatementPdf,
  getOrderDetail,
  releaseOrderPayment,
} from '../services/orderStatement.service';
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
        orderId: result.orderId,
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

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(
        res,
        await getOrderDetail(req.params.id as string, req.user!.userId, req.user!.roleId)
      );
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  statement = async (req: AuthRequest, res: Response) => {
    try {
      const { buffer, filename } = await generateOrderStatementPdf(
        req.params.id as string,
        req.user!.userId,
        req.user!.roleId
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  release = async (req: AuthRequest, res: Response) => {
    try {
      const result = await releaseOrderPayment(
        req.params.id as string,
        req.user!.userId,
        req.user!.roleId,
        req.body.otp
      );
      await createAuditLog(req, 'ORDER_PAYMENT_RELEASED', 'product_order', {
        orderId: req.params.id as string,
      });
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const orderController = new OrderController();
