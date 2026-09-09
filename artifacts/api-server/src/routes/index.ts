import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wellnessRouter from "./wellness";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wellnessRouter);

export default router;
