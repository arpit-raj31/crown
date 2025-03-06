import mongoose from 'mongoose';

const transactionLiveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'trade'], required: true },

  // Store both INR and converted USD amounts
  originalAmount: { type: Number, required: true }, // INR before conversion
  convertedAmount: { type: Number, required: true }, // USD after conversion

  amountTransferred: { type: Number }, // Amount confirmed by external API

  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
  description: { type: String, trim: true },

  // Payment-related fields
  paymentMethod: { type: String, trim: true }, 
  walletType: { type: String, trim: true }, 
  transId: { type: String, unique: true, required: true }, // Changed from Number to String

}, { timestamps: true });

export default mongoose.model('LiveTransaction', transactionLiveSchema);
