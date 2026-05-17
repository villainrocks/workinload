/* This code fixed By Tg:@ImxCodex */
import { Router } from 'express';
import { authenticateCompat, requireAdminCompat } from '../middleware/compatAuth.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticateCompat);
router.use(requireAdminCompat);

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      logs: logger.entries(req.query.limit),
    },
  });
});

export default router;
