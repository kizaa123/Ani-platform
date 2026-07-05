import { Response } from 'express';
import prisma from '../database/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/response';
import { isFarmerRole } from '../constants/roles';
import { persistUploadedFile } from '../services/storage.service';

export class UploadController {
  uploadProfilePicture = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      const url = await persistUploadedFile(req.file, 'profiles');

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

      const urls = await Promise.all(files.map((f) => persistUploadedFile(f, 'listings')));
      ApiResponse.success(res, { urls });
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };

  uploadPublicationFiles = async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const file = files?.file?.[0];
      const cover = files?.cover?.[0];

      if (!file && !cover) {
        return res.status(400).json({ success: false, error: 'No files provided' });
      }

      const result: { fileUrl?: string; coverImage?: string } = {};
      if (file) result.fileUrl = await persistUploadedFile(file, 'publications');
      if (cover) result.coverImage = await persistUploadedFile(cover, 'publications');

      ApiResponse.success(res, result);
    } catch (e) {
      ApiResponse.error(res, e);
    }
  };
}

export const uploadController = new UploadController();
