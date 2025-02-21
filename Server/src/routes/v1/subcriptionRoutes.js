

import express from "express";
import {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
} from "../../controllers/subscriptionController.js";

const router = express.Router();

router.post("/", createSubscription); // Create new subscription
router.get("/", getAllSubscriptions); // Get all subscriptions
router.get("/:id", getSubscriptionById); // Get a single subscription
router.put("/:id", updateSubscription); // Update a subscription
router.delete("/:id", deleteSubscription); // Delete a subscription

export default router;
