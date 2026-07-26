import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { productMediaService } from '../services/productMedia.service';
import { persistProductMediaFile } from '../services/storage.service';
import { ProductMediaType } from '@prisma/client';

export class ProductMediaController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const listingId = req.params.listingId as string;
      const media = await productMediaService.listByListing(listingId, req.user!.userId);
      ApiResponse.success(res, media);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  upload = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No media file provided' });
      }

      const listingId = req.params.listingId as string;
      const isVideo = req.file.mimetype.startsWith('video/');
      const type: ProductMediaType = isVideo ? 'VIDEO' : 'IMAGE';

      const durationRaw = req.body?.duration;
      const duration =
        durationRaw != null && durationRaw !== '' ? parseFloat(String(durationRaw)) : null;

      const { url, duration: cloudDuration } = await persistProductMediaFile(req.file);
      const finalDuration = isVideo ? (cloudDuration ?? duration) : null;

      const media = await productMediaService.createMedia(
        req.user!.userId,
        req.user!.roleId,
        listingId,
        { type, url, duration: finalDuration }
      );

      ApiResponse.created(res, media);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const listingId = req.params.listingId as string;
      const result = await productMediaService.deleteMedia(
        req.user!.userId,
        req.user!.roleId,
        listingId,
        req.params.id as string
      );
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  toggleLike = async (req: AuthRequest, res: Response) => {
    try {
      const result = await productMediaService.toggleLike(
        req.params.id as string,
        req.user!.userId
      );
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  share = async (req: AuthRequest, res: Response) => {
    try {
      const result = await productMediaService.recordShare(req.params.id as string);
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const productMediaController = new ProductMediaController();
