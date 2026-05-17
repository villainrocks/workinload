/* This code fixed By Tg:@ImxCodex */
import { Router } from 'express';
import { dbService } from '../services/db.service.js';
import { authenticateCompat } from '../middleware/compatAuth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();
router.use(authenticateCompat);

// Get config for a specific account
router.get('/:accountId', asyncHandler(async (req, res) => {
  const config = await dbService.getAccountConfig(req.user.id, req.params.accountId);
  res.json({ success: true, data: config });
}));

// Save config for a specific account
router.post('/:accountId', asyncHandler(async (req, res) => {
  const { targets, defaults } = req.body;
  await dbService.saveAccountConfig(req.user.id, req.params.accountId, targets, defaults);
  res.json({ success: true });
}));

export default router;
