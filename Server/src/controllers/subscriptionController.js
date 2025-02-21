
import Subscription from "../models/Subscription.js";

// Create a new subscription plan
export const createSubscription = async (req, res) => {
  try {
    const { planName, price, duration, description } = req.body;

    const newSubscription = new Subscription({ planName, price, duration, description });
    await newSubscription.save();

    res.status(201).json({ success: true, message: "Subscription created", data: newSubscription });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get all subscription plans
export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    res.status(200).json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get a single subscription by ID
export const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update a subscription by ID
export const updateSubscription = async (req, res) => {
  try {
    const updatedSubscription = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updatedSubscription) return res.status(404).json({ success: false, message: "Subscription not found" });

    res.status(200).json({ success: true, message: "Subscription updated", data: updatedSubscription });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete a subscription by ID
export const deleteSubscription = async (req, res) => {
  try {
    const deletedSubscription = await Subscription.findByIdAndDelete(req.params.id);

    if (!deletedSubscription) return res.status(404).json({ success: false, message: "Subscription not found" });

    res.status(200).json({ success: true, message: "Subscription deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


