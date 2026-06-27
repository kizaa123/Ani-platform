import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { buyerService } from '../services/buyer.service';

export class BuyerController {
  financialStatement = async (req: AuthRequest, res: Response) => {
    try {
      const statement = await buyerService.getFinancialStatement(
        req.user!.userId,
        req.user!.roleId
      );
      ApiResponse.success(res, statement);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  orders = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(
        res,
        await buyerService.getOrders(req.user!.userId, req.user!.roleId)
      );
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const buyerController = new BuyerController();
