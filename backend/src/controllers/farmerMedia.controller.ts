import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { farmerMediaService } from '../services/farmerMedia.service';
import { persistFarmerMediaFile } from '../services/storage.service';
import { FarmerMediaType } from '@prisma/client';

export class FarmerMediaController {
  listOwn = async (req: AuthRequest, res: Response) => {
    try {
      const media = await farmerMediaService.listOwnMedia(req.user!.userId, req.user!.roleId);
      ApiResponse.success(res, media);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  listByFarmer = async (req: AuthRequest, res: Response) => {
    try {
      const farmerUserId = req.params.farmerUserId as string;
      const media = await farmerMediaService.listByFarmerUserId(farmerUserId, req.user!.userId);
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

      const isVideo = req.file.mimetype.startsWith('video/');
      const type: FarmerMediaType = isVideo ? 'VIDEO' : 'IMAGE';

      const durationRaw = req.body?.duration;
      const duration =
        durationRaw != null && durationRaw !== '' ? parseFloat(String(durationRaw)) : null;

      const { url, duration: cloudDuration } = await persistFarmerMediaFile(req.file);

      const finalDuration = isVideo ? (cloudDuration ?? duration) : null;

      const media = await farmerMediaService.createMedia(req.user!.userId, req.user!.roleId, {
        type,
        url,
        duration: finalDuration,
      });

      ApiResponse.created(res, media);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const result = await farmerMediaService.deleteMedia(
        req.user!.userId,
        req.user!.roleId,
        req.params.id as string
      );
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  toggleLike = async (req: AuthRequest, res: Response) => {
    try {
      const result = await farmerMediaService.toggleLike(
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
      const result = await farmerMediaService.recordShare(req.params.id as string);
      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const farmerMediaController = new FarmerMediaController();
