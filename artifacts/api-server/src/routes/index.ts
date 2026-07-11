import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import agentRouter from "./agent";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth);
router.use(ordersRouter);
router.use(agentRouter);

export default router;
