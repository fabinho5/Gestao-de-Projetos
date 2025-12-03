import { Router } from "express";
import { PartsController } from "../controllers/parts.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", PartsController.getAllParts);
router.get("/:ref", authenticate, PartsController.getPartById);
router.post("/", authenticate, PartsController.createPart);

export { router as partsRouter };