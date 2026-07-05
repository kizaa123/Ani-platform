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
  aiController,
} from '../controllers/platform.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, updateUserProfileSchema, updateHandlerSchema } from '../services/auth.service';
import { updateFarmSchema, addCommoditySchema, updateOrderTrackSchema } from '../services/farm.service';
import { listingSchema, updateListingSchema } from '../services/marketplace.service';
import { purchaseSchema, packageSchema, purchaseFarmAccessSchema } from '../services/payment.service';
import { purchaseProductSchema } from '../services/order.service';
import { connectionSchema } from '../services/connection.service';
import { assignmentSchema } from '../services/agent.service';
import { messageSchema } from '../services/chat.service';
import { uploadController } from '../controllers/upload.controller';
import { profileUpload, listingImagesUpload } from '../middleware/upload.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';
import { PERMISSIONS } from '../constants/roles';

const router = Router();

// Uploads
router.post(
  '/upload/profile-picture',
  authenticate,
  (req, res, next) => {
    profileUpload(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: err.message });
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
      if (err) return res.status(400).json({ success: false, error: err.message });
      next();
    });
  },
  uploadController.uploadListingImages
);

// Auth
router.post('/auth/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.get('/auth/handlers/:type', authController.listHandlers);
router.post('/auth/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authenticate, authController.logout);
router.get('/auth/me', authenticate, authController.me);
router.put('/auth/profile', authenticate, validateBody(updateUserProfileSchema), authController.updateProfile);
router.put('/auth/handler', authenticate, validateBody(updateHandlerSchema), authController.updateHandler);

// Commodities (public catalog)
router.get('/commodities/categories', commodityController.getCategories);
router.get('/commodities', commodityController.getAll);
router.get('/commodities/category/:name', commodityController.getByCategory);

// Farm
router.get('/farm/profile', authenticate, farmController.getProfile);
router.get('/farm/financial-statement', authenticate, farmController.financialStatement);
router.get('/farm/orders', authenticate, farmController.orders);
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

// Buyer
router.get('/buyer/financial-statement', authenticate, buyerController.financialStatement);
router.get('/buyer/orders', authenticate, buyerController.orders);

// Marketplace
router.get('/marketplace/browse', authenticate, marketplaceController.browse);
router.get('/marketplace', authenticate, marketplaceController.list);
router.get('/marketplace/my', authenticate, marketplaceController.myListings);
router.post(
  '/marketplace/:id/purchase',
  authenticate,
  requirePermission(PERMISSIONS.REQUEST_CONNECTION),
  validateBody(purchaseProductSchema),
  orderController.purchase
);
router.get('/marketplace/:id', authenticate, marketplaceController.getOne);
router.post('/marketplace', authenticate, requirePermission(PERMISSIONS.CREATE_LISTING), validateBody(listingSchema), marketplaceController.create);
router.put('/marketplace/:id', authenticate, requirePermission(PERMISSIONS.CREATE_LISTING), validateBody(updateListingSchema), marketplaceController.update);
router.delete('/marketplace/:id', authenticate, requirePermission(PERMISSIONS.CREATE_LISTING), marketplaceController.remove);

// Payments
router.get('/payments/packages', paymentController.getPackages);
router.get('/payments/access', authenticate, paymentController.accessStatus);
router.post('/payments/purchase', authenticate, requirePermission(PERMISSIONS.PURCHASE_ACCESS), validateBody(purchaseSchema), paymentController.purchase);
router.post('/payments/farm-access', authenticate, requirePermission(PERMISSIONS.PURCHASE_ACCESS), validateBody(purchaseFarmAccessSchema), paymentController.purchaseFarmAccess);
router.get('/payments/history', authenticate, paymentController.history);
router.get('/payments/admin', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), paymentController.allPayments);
router.post('/payments/packages', authenticate, requirePermission(PERMISSIONS.MANAGE_PACKAGES), validateBody(packageSchema), paymentController.createPackage);

// Connections
router.get('/connections', authenticate, connectionController.list);
router.post('/connections', authenticate, requirePermission(PERMISSIONS.REQUEST_CONNECTION), validateBody(connectionSchema), connectionController.create);
router.patch('/connections/:id/status', authenticate, requirePermission(PERMISSIONS.APPROVE_CONNECTION, PERMISSIONS.VERIFY_USERS), connectionController.updateStatus);

// Agents
router.get('/agents/profile', authenticate, agentController.profile);
router.get('/agents/assignments', authenticate, agentController.assignments);
router.get('/agents/clients/:ownerId/farm', authenticate, agentController.clientFarm);
router.get('/agents/clients/:ownerId/orders', authenticate, agentController.clientOrders);
router.patch(
  '/agents/clients/:ownerId/orders/track',
  authenticate,
  validateBody(updateOrderTrackSchema),
  agentController.updateClientOrderTrack
);
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

// Admin
router.get('/admin/stats', authenticate, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), adminController.stats);
router.get('/admin/pending', authenticate, requirePermission(PERMISSIONS.VERIFY_USERS), adminController.pendingUsers);
router.patch('/admin/users/:id/verify', authenticate, requirePermission(PERMISSIONS.VERIFY_USERS), adminController.verifyUser);
router.get('/admin/audit-logs', authenticate, requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS), adminController.auditLogs);

// AI (future-ready)
router.get('/ai/matches', authenticate, aiController.matches);
router.post('/ai/assistant', authenticate, aiController.assistant);
router.post('/ai/disease-detection', authenticate, aiController.diseaseDetection);
router.post('/ai/price-prediction', authenticate, aiController.pricePrediction);

export default router;
