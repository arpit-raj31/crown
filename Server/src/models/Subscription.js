
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    planName: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, required: true }, // Duration in months
    description: { type: String, required: true },
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;