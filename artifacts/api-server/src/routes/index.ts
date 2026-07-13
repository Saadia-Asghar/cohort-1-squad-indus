import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import bakersRouter from "./bakers.js";
import notificationsRouter from "./notifications.js";
import marketplaceRouter from "./marketplace.js";
import productsRouter from "./products.js";
import ordersRouter from "./orders.js";
import cartRouter from "./cart.js";
import reviewsRouter from "./reviews.js";
import customersRouter from "./customers.js";
import analyticsRouter from "./analytics.js";
import chatRouter from "./chat.js";
import knowledgeRouter from "./knowledge.js";
import workspaceRouter from "./workspace.js";
import whatsappRouter from "./whatsapp.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bakersRouter);
router.use(notificationsRouter);
router.use(marketplaceRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(cartRouter);
router.use(reviewsRouter);
router.use(customersRouter);
router.use(analyticsRouter);
router.use(chatRouter);
router.use(knowledgeRouter);
router.use(workspaceRouter);
router.use(whatsappRouter);

export default router;
