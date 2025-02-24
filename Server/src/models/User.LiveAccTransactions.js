import mongoose from 'mongoose';
const transactionLiveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'trade'], required: true },
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
  description: { type: String, trim: true },
}, { timestamps: true });

export default mongoose.model('LiveTransaction', transactionLiveSchema);
