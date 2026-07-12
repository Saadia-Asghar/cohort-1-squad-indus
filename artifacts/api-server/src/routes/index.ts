import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import agentRouter from "./agent";
import publicRouter from "./public";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicRouter); // public routes — no auth required
router.use(requireAuth);  // everything below requires Clerk auth
router.use(ordersRouter);
router.use(agentRouter);

export default router;
