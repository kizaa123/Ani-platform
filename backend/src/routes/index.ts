import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { farmController } from '../controllers/farm.controller';
import { commodityController, marketplaceController } from '../controllers/marketplace.controller';
import { orderController } from '../controllers/order.controller';
import { buyerController } from '../controllers/buyer.controller';
import { paymentController } from '../controllers/payment.controller';
import {
  connectionController,
  agentController,
  chatController,
  notificationController,
  adminController,
  accountantController,
  aiController,
} from '../controllers/platform.controller';
import { authenticate, requirePermission, requireCanPurchaseFromMarketplace, requireApprovedAccountant } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, updateUserProfileSchema, updateHandlerSchema, completeProfileSchema, emailVerificationSendSchema, emailVerificationVerifySchema, phoneVerificationSendSchema, phoneVerificationVerifySchema } from '../services/auth.service';
import { updateFarmSchema, addCommoditySchema, updateOrderTrackSchema, notifyClientSchema } from '../services/farm.service';
import { listingSchema, updateListingSchema } from '../services/marketplace.service';
import { purchaseSchema, packageSchema, purchaseFarmAccessSchema } from '../services/payment.service';
import { purchaseProductSchema, releaseOrderSchema } from '../services/order.service';
import { publicationSchema, updatePublicationSchema, purchasePublicationSchema, commentSchema, updateResearcherProfileSchema } from '../services/researcher.service';
import { connectionSchema } from '../services/connection.service';
import { assignmentSchema } from '../services/agent.service';
import { messageSchema } from '../services/chat.service';
import { verifyUserSchema, assignVerificationTagSchema } from '../services/admin.service';
import { createStaffSchema, updateStaffSchema } from '../services/staff.service';
import { createWithdrawalSchema, updateWithdrawalSchema } from '../services/accountant.service';
import { distributeLineSchema } from '../services/orderDistribution.service';
import { adController } from '../controllers/ad.controller';
import { createAdSchema, updateAdSchema } from '../services/ad.service';
import { uploadController } from '../controllers/upload.controller';
import { farmerMediaController } from '../controllers/farmerMedia.controller';
import { productMediaController } from '../controllers/productMedia.controller';
import { researcherController } from '../controllers/researcher.controller';
import { profileUpload, listingImagesUpload, adImagesUpload, publicationFileUpload, farmMediaUpload, productMediaUpload, MAX_IMAGE_FILE_SIZE, MAX_DOCUMENT_FILE_SIZE, MAX_FARM_MEDIA_FILE_SIZE } from '../middleware/upload.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';
import { PERMISSIONS } from '../constants/roles';

const router = Router();

function uploadErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    const maxMb = Math.round(MAX_IMAGE_FILE_SIZE / (1024 * 1024));
    return `File is too large. Maximum image size is ${maxMb} MB.`;
  }
  if (err instanceof Error) return err.message;
  return 'Upload failed';
}

function publicationUploadErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    const maxMb = Math.round(MAX_DOCUMENT_FILE_SIZE / (1024 * 1024));
    return `File is too large. Maximum document size is ${maxMb} MB.`;
  }
  if (err instanceof Error) return err.message;
  return 'Upload failed';
}

function farmMediaUploadErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    const maxMb = Math.round(MAX_FARM_MEDIA_FILE_SIZE / (1024 * 1024));
    return `File is too large. Maximum farm media size is ${maxMb} MB.`;
  }
  if (err instanceof Error) return err.message;
  return 'Upload failed';
}

// Uploads
router.post(
  '/upload/profile-picture',
  authenticate,
  (req, res, next) => {
    profileUpload(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: uploadErrorMessage(err) });
      next();
    });
  },
  uploadController.uploadProfilePicture
);
router.post(
  '/upload/listing-images',
  authenticate,
  requirePermission(PERMISSIONS.CREATE_LISTING),
  (req, res, next) => {
    listingImagesUpload(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: uploadErrorMessage(err) });
      next();
    });
  },
  uploadController.uploadListingImages
);
router.post(
  '/upload/publication-files',
  authenticate,
  requirePermission(PERMISSIONS.CREATE_PUBLICATION),
  (req, res, next) => {
    publicationFileUpload(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: publicationUploadErrorMessage(err) });
      next();
    });
  },
  uploadController.uploadPublicationFiles
);

// Auth
router.get('/auth/google', authController.googleStart);
router.get('/auth/google/callback', authController.googleCallback);
router.post('/auth/google/dev', authRateLimiter, authController.googleDev);
router.post('/auth/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.get('/auth/handlers/:type', authController.listHandlers);
router.post('/auth/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authenticate, authController.logout);
router.get('/auth/me', authenticate, authController.me);
router.put('/auth/profile', authenticate, validateBody(updateUserProfileSchema), authController.updateProfile);
router.put('/auth/handler', authenticate, validateBody(updateHandlerSchema), authController.updateHandler);
router.post('/auth/email-verification/send', authenticate, validateBody(emailVerificationSendSchema), authController.sendEmailVerification);
router.post('/auth/email-verification/verify', authenticate, validateBody(emailVerificationVerifySchema), authController.verifyEmailChallenge);
router.post('/auth/phone-verification/send', authenticate, validateBody(phoneVerificationSendSchema), authController.sendPhoneVerification);
router.post('/auth/phone-verification/verify', authenticate, validateBody(phoneVerificationVerifySchema), authController.verifyPhoneChallenge);
router.post('/auth/complete-profile', authenticate, validateBody(completeProfileSchema), authController.completeProfile);

// Commodities (public catalog)
router.get('/commodities/categories', commodityController.getCategories);
router.get('/commodities', commodityController.getAll);
router.get('/commodities/category/:name', commodityController.getByCategory);

// Farm
router.get('/farm/profile', authenticate, farmController.getProfile);
router.get('/farm/financial-statement', authenticate, farmController.financialStatement);
router.get('/farm/orders', authenticate, farmController.orders);
router.get('/farm/clients', authenticate, farmController.listClients);
router.post(
  '/farm/notify-client',
  authenticate,
  validateBody(notifyClientSchema),
  farmController.notifyClient
);
router.patch(
  '/farm/orders/track',
  authenticate,
  validateBody(updateOrderTrackSchema),
  farmController.updateOrderTrack
);
router.put('/farm/profile', authenticate, validateBody(updateFarmSchema), farmController.updateProfile);
router.get('/farm/commodities', authenticate, farmController.listCommodities);
router.post('/farm/commodities', authenticate, requirePermission(PERMISSIONS.MANAGE_COMMODITIES), validateBody(addCommoditySchema), farmController.addCommodity);
router.delete('/farm/commodities/:id', authenticate, requirePermission(PERMISSIONS.MANAGE_COMMODITIES), farmController.removeCommodity);

// Farmer media
router.get('/farm/media', authenticate, farmerMediaController.listOwn);
router.get('/farm/media/by-farmer/:farmerUserId', authenticate, farmerMediaController.listByFarmer);
router.post(
  '/farm/media',
  authenticate,
  requirePermission(PERMISSIONS.CREATE_LISTING),
  (req, res, next) => {
    farmMediaUpload(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: farmMediaUploadErrorMessage(err) });
      next();
    });
  },
  farmerMediaController.upload
);
router.delete(
  '/farm/media/:id',
  authenticate,
  requirePermission(PERMISSIONS.CREATE_LISTING),
  farmerMediaController.remove
);
router.post('/farm/media/:id/like', authenticate, farmerMediaController.toggleLike);
router.post('/farm/media/:id/share', authenticate, farmerMediaController.share);

// Product media (per listing)
router.get('/farm/listings/:listingId/media', authenticate, productMediaController.list);
router.post(
  '/farm/listings/:listingId/media',
  authenticate,
  requirePermission(PERMISSIONS.CREATE_LISTING),
  (req, res, next) => {
    productMediaUpload(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: farmMediaUploadErrorMessage(err) });
      next();
    });
  },
  productMediaController.upload
);
router.delete(
  '/farm/listings/:listingId/media/:id',
  authenticate,
  requirePermission(PERMISSIONS.CREATE_LISTING),
  productMediaController.remove
);
router.post('/farm/listings/:listingId/media/:id/like', authenticate, productMediaController.toggleLike);
router.post('/farm/listings/:listingId/media/:id/share', authenticate, productMediaController.share);

// Buyer
router.get('/buyer/financial-statement', authenticate, buyerController.financialStatement);
router.get('/buyer/orders', authenticate, buyerController.orders);

// Research library
router.get('/research/clients', authenticate, requirePermission(PERMISSIONS.MANAGE_PUBLICATIONS), researcherController.listClients);
router.post(
  '/research/notify-client',
  authenticate,
  requirePermission(PERMISSIONS.MANAGE_PUBLICATIONS),
  validateBody(notifyClientSchema),
  researcherController.notifyClient
);
router.get('/research/browse', authenticate, researcherController.browse);
router.get('/research/publishers', authenticate, researcherController.browsePublishers);
router.get('/research/publisher/:publisherId', authenticate, researcherController.getPublisherLibrary);
router.get('/research/my', authenticate, requirePermission(PERMISSIONS.MANAGE_PUBLICATIONS), researcherController.myPublications);
router.get('/research/financial-statement', authenticate, requirePermission(PERMISSIONS.MANAGE_PUBLICATIONS), researcherController.financialStatement);
router.put('/research/profile', authenticate, requirePermission(PERMISSIONS.MANAGE_PUBLICATIONS), validateBody(updateResearcherProfileSchema), researcherController.updateProfile);
router.get(
  '/research/publication-policy',
  authenticate,
  requirePermission(PERMISSIONS.MANAGE_PUBLICATIONS),
  researcherController.publicationPolicyStatus
);
router.post(
  '/research/publication-policy/accept',
  authenticate,
  requirePermission(PERMISSIONS.MANAGE_PUBLICATIONS),
  researcherController.acceptPublicationPolicy
);
router.get('/research/:id/document', authenticate, researcherController.document);
router.get('/research/:id/comments', authenticate, researcherController.listComments);
router.post('/research/:id/comments', authenticate, validateBody(commentSchema), researcherController.addComment);
router.post('/research/:id/like', authenticate, researcherController.toggleLike);
router.post('/research/:id/share', authenticate, researcherController.share);
router.post('/research/:id/view', authenticate, researcherController.recordView);
router.post(
  '/research/:id/purchase',
  authenticate,
  validateBody(purchasePublicationSchema),
  researcherController.purchase
);
router.get('/research/:id', authenticate, researcherController.getOne);
router.post(
  '/research',
  authenticate,
  requirePermission(PERMISSIONS.CREATE_PUBLICATION),
  validateBody(publicationSchema),
  researcherController.create
);
router.put(
  '/research/:id',
  authenticate,
  requirePermission(PERMISSIONS.MANAGE_PUBLICATIONS),
  validateBody(updatePublicationSchema),
  researcherController.update
);
router.delete(
  '/research/:id',
  authenticate,
  requirePermission(PERMISSIONS.MANAGE_PUBLICATIONS),
  researcherController.remove
);

// Marketplace
router.get('/marketplace/browse', authenticate, marketplaceController.browse);
router.get('/marketplace', authenticate, marketplaceController.list);
router.get('/marketplace/my', authenticate, marketplaceController.myListings);
router.post(
  '/marketplace/:id/purchase',
  authenticate,
  requireCanPurchaseFromMarketplace(),
  validateBody(purchaseProductSchema),
  orderController.purchase
);
router.get('/orders/:id', authenticate, orderController.getOne);
router.get('/orders/:id/statement', authenticate, orderController.statement);
router.post(
  '/orders/:id/release',
  authenticate,
  requireCanPurchaseFromMarketplace(),
  validateBody(releaseOrderSchema),
  orderController.release
);
router.get('/marketplace/:id', authenticate, marketplaceController.getOne);
router.post('/marketplace', authenticate, requirePermission(PERMISSIONS.CREATE_LISTING), validateBody(listingSchema), marketplaceController.create);
router.put('/marketplace/:id', authenticate, requirePermission(PERMISSIONS.CREATE_LISTING), validateBody(updateListingSchema), marketplaceController.update);
router.delete('/marketplace/:id', authenticate, requirePermission(PERMISSIONS.CREATE_LISTING), marketplaceController.remove);

// Payments
router.get('/payments/packages', paymentController.getPackages);
router.get('/payments/access', authenticate, paymentController.accessStatus);
router.post('/payments/purchase', authenticate, requirePermission(PERMISSIONS.PURCHASE_ACCESS), validateBody(purchaseSchema), paymentController.purchase);
router.post('/payments/farm-access', authenticate, requireCanPurchaseFromMarketplace(), validateBody(purchaseFarmAccessSchema), paymentController.purchaseFarmAccess);
router.get('/payments/history', authenticate, paymentController.history);
router.get('/payments/admin', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), paymentController.allPayments);
router.post('/payments/packages', authenticate, requirePermission(PERMISSIONS.MANAGE_PACKAGES), validateBody(packageSchema), paymentController.createPackage);

// Connections
router.get('/connections', authenticate, connectionController.list);
router.post('/connections', authenticate, requirePermission(PERMISSIONS.REQUEST_CONNECTION), validateBody(connectionSchema), connectionController.create);
router.patch('/connections/:id/status', authenticate, requirePermission(PERMISSIONS.APPROVE_CONNECTION), connectionController.updateStatus);

// Agents
router.get('/agents/profile', authenticate, agentController.profile);
router.get('/agents/assignments', authenticate, agentController.assignments);
router.get('/agents/clients', authenticate, agentController.listClients);
router.post(
  '/agents/notify-client',
  authenticate,
  validateBody(notifyClientSchema),
  agentController.notifyClient
);
router.get('/agents/clients/:ownerId/farm', authenticate, agentController.clientFarm);
router.get('/agents/clients/:ownerId/farm/products', authenticate, agentController.clientFarmProducts);
router.get('/agents/clients/:ownerId/orders', authenticate, agentController.clientOrders);
router.patch(
  '/agents/clients/:ownerId/orders/track',
  authenticate,
  validateBody(updateOrderTrackSchema),
  agentController.updateClientOrderTrack
);
router.get('/agents/financial-statement', authenticate, agentController.financialStatement);
router.get('/agents/clients/:ownerId/financial-statement', authenticate, agentController.clientFinancialStatement);
router.get('/agents/clients/:ownerId/connections', authenticate, agentController.clientConnections);
router.post('/agents/assignments', authenticate, validateBody(assignmentSchema), agentController.createAssignment);
router.delete('/agents/assignments/:id', authenticate, agentController.removeAssignment);

// Chat
router.post('/messages', authenticate, requirePermission(PERMISSIONS.SEND_MESSAGES), validateBody(messageSchema), chatController.send);
router.get('/messages/:partnerId', authenticate, chatController.conversation);

// Notifications
router.get('/notifications', authenticate, notificationController.list);
router.get('/notifications/unread-count', authenticate, notificationController.unreadCount);
router.patch('/notifications/read-all', authenticate, notificationController.markAllRead);
router.patch('/notifications/:id/read', authenticate, notificationController.markRead);

// Internal ads (authenticated users)
router.get('/ads', authenticate, adController.listForUser);

// Admin (user verification & platform analytics)
router.get(
  '/admin/stats',
  authenticate,
  requirePermission(PERMISSIONS.VERIFY_USERS),
  adminController.stats
);
router.get(
  '/admin/dashboard-charts',
  authenticate,
  requirePermission(PERMISSIONS.VERIFY_USERS),
  adminController.dashboardCharts
);
router.get('/admin/financial-statement', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), adminController.financialStatement);
router.get('/admin/pending', authenticate, requirePermission(PERMISSIONS.VERIFY_USERS), adminController.pendingUsers);
router.get('/admin/users', authenticate, requirePermission(PERMISSIONS.VERIFY_USERS), adminController.listUsers);
router.patch('/admin/users/:id/verify', authenticate, requirePermission(PERMISSIONS.VERIFY_USERS), validateBody(verifyUserSchema), adminController.verifyUser);
router.get('/admin/users/:id/verification-tags', authenticate, requirePermission(PERMISSIONS.VERIFY_USERS), adminController.listUserVerificationTags);
router.post('/admin/users/:id/verification-tags', authenticate, requirePermission(PERMISSIONS.VERIFY_USERS), validateBody(assignVerificationTagSchema), adminController.assignVerificationTag);
router.delete('/admin/users/:id/verification-tags/:tagType', authenticate, requirePermission(PERMISSIONS.VERIFY_USERS), adminController.removeVerificationTag);
router.get('/admin/audit-logs', authenticate, requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS), adminController.auditLogs);

// Admin staff management (ANI team)
router.get('/admin/staff', authenticate, requirePermission(PERMISSIONS.MANAGE_USERS), adminController.listStaff);
router.post('/admin/staff', authenticate, requirePermission(PERMISSIONS.MANAGE_USERS), validateBody(createStaffSchema), adminController.createStaff);
router.patch('/admin/staff/:id', authenticate, requirePermission(PERMISSIONS.MANAGE_USERS), validateBody(updateStaffSchema), adminController.updateStaff);

// Admin ads management
router.get('/admin/ads', authenticate, requirePermission(PERMISSIONS.MANAGE_ADS), adController.listAll);
router.get('/admin/ads/:id', authenticate, requirePermission(PERMISSIONS.MANAGE_ADS), adController.getOne);
router.post('/admin/ads', authenticate, requirePermission(PERMISSIONS.MANAGE_ADS), validateBody(createAdSchema), adController.create);
router.put('/admin/ads/:id', authenticate, requirePermission(PERMISSIONS.MANAGE_ADS), validateBody(updateAdSchema), adController.update);
router.delete('/admin/ads/:id', authenticate, requirePermission(PERMISSIONS.MANAGE_ADS), adController.remove);
router.post(
  '/upload/ad-image',
  authenticate,
  requirePermission(PERMISSIONS.MANAGE_ADS),
  (req, res, next) => {
    adImagesUpload(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: uploadErrorMessage(err) });
      next();
    });
  },
  uploadController.uploadAdImage
);

// Accountant (financial portal)
router.get('/accountant/overview', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, accountantController.overview);
router.get('/accountant/income-chart', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, accountantController.incomeChart);
router.get('/accountant/dashboard-charts', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, accountantController.dashboardCharts);
router.get('/accountant/financial-statement', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, adminController.financialStatement);
router.get('/accountant/withdrawals', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, accountantController.listWithdrawals);
router.post('/accountant/withdrawals', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, validateBody(createWithdrawalSchema), accountantController.createWithdrawal);
router.patch('/accountant/withdrawals/:id', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, validateBody(updateWithdrawalSchema), accountantController.updateWithdrawal);
router.get('/accountant/orders/:orderId/distribution', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, accountantController.getOrderDistribution);
router.post('/accountant/orders/:orderId/distribution/lines/:lineId/distribute', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, validateBody(distributeLineSchema), accountantController.distributeOrderLine);
router.post('/accountant/orders/:orderId/distribution/distribute-all', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, validateBody(distributeLineSchema.pick({ paymentMethod: true })), accountantController.distributeOrderAll);
router.get('/accountant/orders/:orderId/distribution/lines/:lineId/message-pdf', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), requireApprovedAccountant, accountantController.getDistributionMessagePdf);

// AI (future-ready)
router.get('/ai/matches', authenticate, aiController.matches);
router.post('/ai/assistant', authenticate, aiController.assistant);
router.post('/ai/disease-detection', authenticate, aiController.diseaseDetection);
router.post('/ai/price-prediction', authenticate, aiController.pricePrediction);

export default router;
