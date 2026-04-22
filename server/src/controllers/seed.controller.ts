import { Request, Response, NextFunction } from 'express';
import { seedSyntheticData } from '../utils/syntheticSeed';

export const seedSyntheticDataHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reset = req.body?.reset !== undefined ? Boolean(req.body.reset) : true;
    const seed = req.body?.seed !== undefined ? Number(req.body.seed) : undefined;

    const result = await seedSyntheticData({ reset, seed });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

