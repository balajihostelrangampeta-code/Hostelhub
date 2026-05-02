import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import roomsRouter from "./rooms";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import { requireAuth } from "../middleware/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

router.use(requireAuth);

router.use(dashboardRouter);
router.use(studentsRouter);
router.use(roomsRouter);
router.use(paymentsRouter);

export default router;
