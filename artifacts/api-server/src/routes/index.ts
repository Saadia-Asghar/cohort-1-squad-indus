import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bakersRouter from "./bakers";
import notificationsRouter from "./notifications";
import marketplaceRouter from "./marketplace";
import productsRouter from "./products";
import ordersRouter from "./orders";
import cartRouter from "./cart";
import reviewsRouter from "./reviews";
import customersRouter from "./customers";
import analyticsRouter from "./analytics";
import chatRouter from "./chat";
import knowledgeRouter from "./knowledge";
import workspaceRouter from "./workspace";
import whatsappRouter from "./whatsapp";

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
