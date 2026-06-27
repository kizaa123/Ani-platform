import { Response } from 'express';
import prisma from '../database/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { isFarmerRole } from '../constants/roles';
import { publicUrl } from '../middleware/upload.middleware';

export class UploadController {
  uploadProfilePicture = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      const url = publicUrl(`profiles/${req.file.filename}`);

      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { profilePicture: url },
      });

      ApiResponse.success(res, { url, message: 'Profile picture updated' });
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  uploadListingImages = async (req: AuthRequest, res: Response) => {
    try {
      if (!isFarmerRole(req.user!.roleId)) {
        return res.status(403).json({ success: false, error: 'Only farmers can upload product images' });
      }

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files?.length) {
        return res.status(400).json({ success: false, error: 'No image files provided' });
      }

      const urls = files.map((f) => publicUrl(`listings/${f.filename}`));
      ApiResponse.success(res, { urls });
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const uploadController = new UploadController();
