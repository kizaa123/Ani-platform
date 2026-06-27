import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { commodityService } from '../services/commodity.service';
import { marketplaceService } from '../services/marketplace.service';
import { createAuditLog } from '../middleware/audit.middleware';

export class CommodityController {
  getCategories = async (_req: Request, res: Response) => {
    try {
      ApiResponse.success(res, await commodityService.getCategories());
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  getAll = async (_req: Request, res: Response) => {
    try {
      ApiResponse.success(res, await commodityService.getAll());
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  getByCategory = async (req: Request, res: Response) => {
    try {
      ApiResponse.success(res, await commodityService.getByCategory(req.params.name));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export class MarketplaceController {
  create = async (req: AuthRequest, res: Response) => {
    try {
      const listing = await marketplaceService.createListing(req.user!.userId, req.user!.roleId, req.body);
      await createAuditLog(req, 'LISTING_CREATED', 'commodity_listing', { id: listing.id });
      ApiResponse.created(res, listing);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  list = async (req: AuthRequest, res: Response) => {
    try {
      const listings = await marketplaceService.listPublic(req.user!.userId, req.user!.roleId);
      ApiResponse.success(res, listings);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  browse = async (req: AuthRequest, res: Response) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const data = await marketplaceService.browseMarketplace(req.user!.userId, req.user!.roleId, q);
      ApiResponse.success(res, data);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const listing = await marketplaceService.getListing(req.params.id, req.user!.userId, req.user!.roleId);
      ApiResponse.success(res, listing);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const listing = await marketplaceService.updateListing(
        req.user!.userId,
        req.user!.roleId,
        req.params.id,
        req.body
      );
      await createAuditLog(req, 'LISTING_UPDATED', 'commodity_listing');
      ApiResponse.success(res, listing);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  myListings = async (req: AuthRequest, res: Response) => {
    try {
      ApiResponse.success(res, await marketplaceService.myListings(req.user!.userId));
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      await marketplaceService.deleteListing(req.user!.userId, req.params.id);
      await createAuditLog(req, 'LISTING_REMOVED', 'commodity_listing', { id: req.params.id });
      ApiResponse.success(res, { message: 'Product removed from your farm' });
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const commodityController = new CommodityController();
export const marketplaceController = new MarketplaceController();
