import mongoose from 'mongoose';

const transactionDemoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'trade'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['success', 'failure', 'pending'], default: 'pending' },
  description: { type: String, trim: true },
}, { timestamps: true });


export default mongoose.model('DemoTransaction', transactionDemoSchema);