import express from "express";
import { registerLead } from "../controllers/leadsController.js";

const router = express.Router();
router.post("/lead", registerLead);

export default router;
