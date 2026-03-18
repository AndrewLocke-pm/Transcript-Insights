import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transcribeRouter from "./transcribe";
import analyseRouter from "./analyse";
import processAudioRouter from "./process-audio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(transcribeRouter);
router.use(analyseRouter);
router.use(processAudioRouter);

export default router;
