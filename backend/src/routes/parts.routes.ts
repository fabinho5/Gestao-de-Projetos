import { Router } from "express";
import { PartsController } from "../controllers/parts.controller.js";

const router = Router();

router.get("/", PartsController.getAllParts);
router.get("/:ref", PartsController.getPartById);

export { router as partsRouter };