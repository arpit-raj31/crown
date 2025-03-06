import DemoAccount from "../models/User.DemoAccount.js";
import DemoTransaction from "../models/User.DemoTransaction.js";
import LiveAccount from "../models/User.LiveAccount.model.js";
import LiveTransaction from "../models/User.LiveAccTransactions.js";
import User from "../models/User.js";
import nodemailer from "nodemailer";
import ShortUniqueId from "short-uuid";
import mongoose from "mongoose";
import axios from "axios";
const translator = ShortUniqueId();

const generateCustomUuid = async () => {
  let uniqueUuid;
  let isUnique = false;

  while (!isUnique) {
    // Generate a 6-digit number prefixed with 'BG'
    const uniquePart = Math.floor(100000 + Math.random() * 900000);
    uniqueUuid = `BG${uniquePart}`;

    // Check if the UUID exists in the database
    const existingAccount = await LiveAccount.findOne({
      liveAccountUniqueId: uniqueUuid,
    });

    if (!existingAccount) {
      isUnique = true; // UUID is unique
    }
  }

  return uniqueUuid;
};
export const createLiveAccount = async (req, res) => {
  try {
    const {
      userId,
      walletPin,
      leverage,
      currency,
      accountNickname,
      customLeverage,
      accountType,
    } = req.body;

    // 🔍 Validate required fields
    if (
      !userId ||
      !walletPin ||
      !currency ||
      !accountNickname ||
      !accountType
    ) {
      return res.status(400).json({
        message:
          "User ID, wallet PIN, currency, account nickname, and account type are required.",
      });
    }

    if (!leverage && !customLeverage) {
      return res.status(400).json({
        message: "Either leverage or custom leverage must be provided.",
      });
    }

    if (walletPin.length !== 4) {
      return res
        .status(400)
        .json({ message: "Wallet PIN must be exactly 4 digits long." });
    }

    if (customLeverage && !/^1:\d+$/.test(customLeverage)) {
      return res
        .status(400)
        .json({ message: 'Custom leverage must be in the format "1:number".' });
    }

    //  Check if the user already has a live account
    const existingAccount = await LiveAccount.findOne({ user: userId });
    if (existingAccount) {
      return res
        .status(400)
        .json({ message: "Live account already exists for this user." });
    }

    //  Generate a unique account ID
    const liveAccountUniqueId = await generateCustomUuid();

    //  Create the account with default balance (0)
    const newLiveAccount = await LiveAccount.create({
      user: userId,
      liveAccountUniqueId,
      walletPin,
      leverage,
      currency,
      accountNickname,
      customLeverage,
      accountType,
      balance: 0,
      leverageBalance: 0,
    });

    // Fetch updated balance
    const updatedAccount = await LiveAccount.findById(newLiveAccount._id);
    const leverageValue = updatedAccount.customLeverage
      ? parseInt(updatedAccount.customLeverage.split(":")[1], 10)
      : parseInt(updatedAccount.leverage.split(":")[1], 10);

    //  Calculate leverage balance
    const leverageBalance = updatedAccount.balance * leverageValue;

    // Update leverage balance
    updatedAccount.leverageBalance = leverageBalance;
    await updatedAccount.save();

    //  Link account to user
    await User.findByIdAndUpdate(userId, { liveAccount: updatedAccount._id });

    // Send email confirmation
    const user = await User.findById(userId);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your Live Account Created Successfully",
      text: `Hello ${user.username},
    
    Your live account has been successfully created!
    
    📌 **Live Account ID:** ${liveAccountUniqueId}
    
    💳 **Account Type:** ${accountType}
    💰 **Currency:** ${currency}
    📈 **Leverage:** ${leverage || customLeverage}
    
    Please keep your Live Account ID safe, as it is required for transactions.
    
    Best regards,  
    Your Trading Platform Team`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message:
        "Live account created successfully. The unique account ID has been securely stored.",
      liveAccount: updatedAccount,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error creating live account.",
      error: err.message,
    });
  }
};

export const getLiveAccount = async (req, res) => {
  const { userId } = req.params;

  try {
    const account = await LiveAccount.findOne({ user: userId }).populate("user", "username email _id");

    if (!account) {
      return res.status(404).json({ message: "Live account not found for this user." });
    }

    // Filtered response to only return specific fields
    const filteredAccountData = {
      _id: account._id,
      user: {
        _id: account.user._id,
      },
      leverage: account.leverage,
      leverageBalance: account.leverageBalance,
      balance: account.balance,
    };

    // Send the filtered data
    res.status(200).json({ account: filteredAccountData });
  } catch (err) {
    res.status(500).json({ message: "Error fetching live account", error: err.message });
  }
};


export const updateBalance = async (req, res) => {
  const { userId } = req.params;
  const { balance } = req.body;

  try {
    const account = await LiveAccount.findOne({ user: userId });
    if (!account) {
      return res.status(404).json({ message: "Live account not found" });
    }

    account.balance = balance;

    await account.save();

    res.status(200).json({ message: "Balance updated successfully", account });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating balance", error: err.message });
  }
};

const getUSDExchangeRate = async () => {
  try {
    const response = await axios.get("https://api.exchangerate-api.com/v4/latest/INR");
    return response.data.rates.USD; // Get INR to USD conversion rate
  } catch (error) {
    console.error("Error fetching exchange rate:", error.message);
    return null;
  }
};
export const withdraw = async (req, res) => {
  try {
    const { userId } = req.params;
    const { walletType, wID, pwd, amount, paymentType } = req.body;
    const securityKey="8babe957-841d-461f-a4c0-c3d8046e24cc";
    if (!userId || !wID || !pwd || !amount || amount <= 0 || !walletType || !paymentType) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const validWalletTypes = ["INCOMEWALLET"];
    if (!validWalletTypes.includes(walletType)) {
      return res.status(400).json({ success: false, message: "Invalid wallet type. Choose IncomeWallet." });
    }

   
    const originalAmount = amount;
    const usdRate = await getUSDExchangeRate();
    if (!usdRate) {
      return res.status(500).json({ success: false, message: "Failed to fetch exchange rate" });
    }

    // Convert amount to INR before passing to wallet API
    const amountINR = originalAmount / usdRate;

    const liveAccount = await LiveAccount.findOne({ user: userId });
    if (!liveAccount) {
      return res.status(404).json({ success: false, message: "Live account not found" });
    }

    if (liveAccount.balance < originalAmount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }
    let apiKey;
    try {
      const apiKeyResponse = await axios.post("https://mywallet.life/wallet-api.php", {
        walletType, wID, pwd, securityKey
      });

      if (!apiKeyResponse.data || apiKeyResponse.data.response !== 1) {
        return res.status(400).json({ success: false, message: "Failed to fetch API Key" });
      }

      apiKey = apiKeyResponse.data.apikey;
    } catch (err) {
      console.error("API Key fetch failed:", err.message);
      return res.status(500).json({ success: false, message: "Error fetching API key" });
    }

    let paymentResponse;
    try {
      paymentResponse = await axios.post("https://mywallet.life/wallet-api.php", {
        walletType, wID, pwd, amount: amountINR, paymentType, apiKey, securityKey
      });

      if (!paymentResponse || !paymentResponse.data || paymentResponse.data.response !== 1 || !paymentResponse.data.transId) {
        return res.status(400).json({ success: false, message: "Withdrawal failed", data: paymentResponse?.data });
      }
    } catch (err) {
      console.error("Withdrawal API call failed:", err.message);
      return res.status(500).json({ success: false, message: "Error processing withdrawal" });
    }

    // Save Transaction in Database
    const newTransaction = new LiveTransaction({
      user: userId,
      type: "withdrawal",
      originalAmount, // Store original amount
      convertedAmount: amountINR,  // Store converted INR amount
      transId: paymentResponse.data.transId,
      status: "pending",
      description: "Withdraw from live account",
      walletType,
      paymentType,
    });

    await newTransaction.save();

    res.status(200).json({
      success: true,
      message: "Withdrawal successful.",
      transId: paymentResponse.data.transId,
    });

  } catch (err) {
    console.error("Error during withdrawal:", err.message);
    res.status(500).json({
      success: false,
      message: "Error processing withdrawal",
      error: err.message,
    });
  }
};

export const admindeposit = async (req, res) => {
  const { userId } = req.params;
  const { walletType, wID, pwd, amount, paymentType, apiKey } = req.body;
  const securityKey="8babe957-841d-461f-a4c0-c3d8046e24cc";
  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is missing" });
  }
  if (!walletType || !wID || !pwd || !amount || amount <= 0 || !paymentType) {
    return res.status(400).json({ success: false, message: "Missing or invalid deposit details" });
  }

  // Fetch exchange rate (INR to USD)
  const exchangeRate = await getUSDExchangeRate();
  if (!exchangeRate) {
    return res.status(500).json({ success: false, message: "Failed to fetch exchange rate" });
  }

  // Convert INR to USD
  const convertedAmount = parseFloat((amount * exchangeRate).toFixed(2)); // Ensures two decimal places
  const originalAmount = amount; // Store original INR value

  // Start a session
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      let resolvedApiKey = apiKey;

      // Fetch API key if not provided
      if (!resolvedApiKey) {
        const apiKeyResponse = await axios.post(
          "https://mywallet.life/wallet-api.php",
          { walletType, wID, pwd,securityKey }
        );

        if (apiKeyResponse.data.response !== 1) {
          throw new Error("Failed to retrieve API key");
        }
        resolvedApiKey = apiKeyResponse.data.apikey;
      }

      // Prepare payment data
      const paymentData = {
        walletType,
        wID,
        pwd,
        apiKey: resolvedApiKey,
        amount: convertedAmount, // Send converted USD amount
        paymentType,
        securityKey
       
      };

      // Call external API for payment processing
      const paymentResponse = await axios.post(
        "https://mywallet.life/wallet-api.php",
        paymentData
      );

      if (paymentResponse.data.response !== 1) {
        throw new Error("Payment failed");
      }

      const { walletType: responseWalletType, transferAmount, transId } = paymentResponse.data;

      if (!transId) {
        throw new Error("Transaction ID is missing in the response");
      }

      // Check if live account exists
      let liveAccount = await LiveAccount.findOne({ user: userId }).session(session);
      if (!liveAccount) {
        throw new Error("Live account not found");
      }

      // Prevent duplicate transaction processing
      const existingTransaction = await LiveTransaction.findOne({ transId }).session(session);
      if (existingTransaction) {
        throw new Error("Duplicate transaction ID");
      }

      // Create new transaction record
      const newTransaction = await LiveTransaction.create(
        [{
          user: userId,
          type: "deposit",
          originalAmount, // Store INR amount
          convertedAmount, // Store converted USD amount
          amount: convertedAmount, // The amount in USD
          status: "success",
          description: "Deposit to Live account",
          paymentMethod: paymentType,
          walletType: responseWalletType,
          transId,
        }],
        { session }
      );

      // Update user's live account balance
      liveAccount.transactions.push(newTransaction[0]._id);
      liveAccount.balance += convertedAmount; // Add USD balance

      // Calculate leverage balance
      const leverageString = liveAccount.customLeverage || liveAccount.leverage;
      const leverageValue = leverageString ? parseInt(leverageString.split(":")[1], 10) : 1;
      liveAccount.leverageBalance = liveAccount.balance * (leverageValue || 1);

      await liveAccount.save({ session });
    });

    session.endSession();
    res.status(200).json({ success: true, message: "Admin deposit successful" });

  } catch (err) {
    session.endSession();
    console.error("Error during admin deposit:", err.message);
    res.status(500).json({ success: false, message: "Error processing admin deposit", error: err.message });
  }
};
export const deposit = async (req, res) => {
  const { userId } = req.params;
  const { walletType, wID, pwd, amount, paymentType, apiKey } = req.body;
 const securityKey="8babe957-841d-461f-a4c0-c3d8046e24cc";
  try {
    if (!walletType || !wID || !pwd) {
      return res.status(400).json({ message: 'Missing walletType, wID, or pwd' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid deposit amount' });
    }
    if (!paymentType) {
      return res.status(400).json({ message: 'Missing payment type' });
    }

    // Get INR to USD conversion rate
    const exchangeRate = await getUSDExchangeRate();
    if (!exchangeRate) {
      return res.status(500).json({ message: 'Failed to fetch exchange rate' });
    }

    // Convert amount from INR to USD
    const convertedAmount = (amount * exchangeRate).toFixed(2); // Rounded to 2 decimals

    let resolvedApiKey = apiKey;
    if (!resolvedApiKey) {
      const paymentResponse = await axios.post('https://mywallet.life/wallet-api.php', {
        walletType,
        wID,
        pwd,securityKey
      });

      if (paymentResponse.data.response !== 1) {
        return res.status(400).json({ message: 'Failed to retrieve API key' });
      }
      resolvedApiKey = paymentResponse.data.apikey;
    }

    // Final payment data
    const paymentData = {
      walletType,
      wID,
      pwd,
      apiKey: resolvedApiKey,
      amount, 
      paymentType,
      securityKey
    };

    const paymentTransactionResponse = await axios.post('https://mywallet.life/wallet-api.php', paymentData);

    if (paymentTransactionResponse.data.response !== 1) {
      return res.status(400).json({ message: 'Payment failed' });
    }

    const { transferAmount, transId } = paymentTransactionResponse.data;
    if (!transId) {
      return res.status(400).json({ message: 'Transaction ID missing in response' });
    }

    const liveAccount = await LiveAccount.findOne({ user: userId });
    if (!liveAccount) {
      return res.status(404).json({ message: 'Live account not found' });
    }

    // Prevent duplicate transactions
    const existingTransaction = await LiveTransaction.findOne({ transId });
    if (existingTransaction) {
      return res.status(400).json({ message: 'Duplicate transId' });
    }

    // Save transaction in database
    const newTransaction = await LiveTransaction.create({
      user: userId,
      type: 'deposit',
      originalAmount: amount, // INR before conversion
      convertedAmount, // USD after conversion
      amountTransferred: transferAmount,
      status: 'pending',
      description: 'Deposit to Live account',
      paymentMethod: paymentType,
      walletType,
      transId,
    });

    res.status(200).json({
      success: true,
      message: `Deposit successfully processed. Converted ${amount} INR to ${convertedAmount} USD`,
      transaction: newTransaction,
    });

  } catch (err) {
    console.error('Error during deposit:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error processing deposit',
      error: err.message,
    });
  }
};
export const updateTransactionStatus = async (req, res) => {
  const { transId } = req.params;
  const { status } = req.body;


  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the transaction by transId
    const transaction = await LiveTransaction.findOne({ transId }).session(session);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Prevent updating if the transaction is already completed
    if (transaction.status === "success") {
      return res.status(400).json({ message: "Transaction already completed" });
    }

    // Update transaction status
    transaction.status = status;
    await transaction.save({ session });

    // If status is "success", update user's live account balance
    if (status === "success") {
      const liveAccount = await LiveAccount.findOne({ user: transaction.user }).session(session);
      if (!liveAccount) {
        return res.status(404).json({ message: "Live account not found" });
      }

      // Determine if it's a deposit or withdrawal
      if (transaction.type === "deposit") {
        liveAccount.balance += transaction.convertedAmount;
      } else if (transaction.type === "withdrawal") {
        if (liveAccount.balance < transaction. originalAmount) {
          return res.status(400).json({ message: "Insufficient balance for withdrawal" });
        }
        liveAccount.balance -= transaction. originalAmount;
      }

      // Recalculate leverage balance
      const leverageString = liveAccount.customLeverage || liveAccount.leverage;
      const leverageValue = parseInt(leverageString.split(":")[1], 10) || 1;
      liveAccount.leverageBalance = liveAccount.balance * leverageValue;

      // Link the transaction to the user's account transactions
      liveAccount.transactions.push(transaction._id);

      // Save the live account update
      await liveAccount.save({ session });
    }

    // Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: `Transaction status updated to ${status}`,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error updating transaction status:", err.message);
    res.status(500).json({
      message: "Error updating transaction status",
      error: err.message,
    });
  }
};


export const innerLogin = async (req, res) => {
  const { liveAccountUniqueId, walletPin } = req.body;

  if (!liveAccountUniqueId || !walletPin) {
    return res
      .status(400)
      .json({ message: "UUID and Wallet Pin are required" });
  }

  try {
    const liveAccount = await LiveAccount.findOne({ liveAccountUniqueId });

    if (!liveAccount) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (liveAccount.walletPin !== walletPin) {
      return res.status(401).json({ message: "Invalid Wallet Pin" });
    }

    return res
      .status(200)
      .json({ message: "Login successful", user: liveAccount });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

//Demo Acoount Start

export const createDemoAccount = async (req, res) => {
  const {
    userId,
    leverage,
    currency,
    accountNickname,
    customLeverage,
    balance,
    accountType,
  } = req.body;

  if (!userId || !currency || !accountNickname || !balance || !accountType) {
    return res.status(400).json({
      message:
        "User ID, currency, and account nickname balance accountType are required.",
    });
  }

  try {
    const existingAccount = await DemoAccount.findOne({ user: userId });
    if (existingAccount) {
      return res
        .status(400)
        .json({ message: "Demo account already exists for this user" });
    }

    const newDemoAccount = new DemoAccount({
      user: userId,
      balance,
      leverage,
      currency,
      accountNickname,
      customLeverage,
      accountType,
    });

    await newDemoAccount.save();

    await User.findByIdAndUpdate(userId, { demoAccount: newDemoAccount._id });

    res.status(201).json({
      message: "Demo account created successfully",
      demoAccount: newDemoAccount,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error creating demo account",
      error: err.message,
    });
  }
};

export const getDemoAccount = async (req, res) => {
  const { userId } = req.params;

  try {
    const account = await DemoAccount.findOne({ user: userId }).populate(
      "user",
      "username email"
    );
    if (!account) {
      return res.status(404).json({ message: "Live account not found" });
    }

    res.status(200).json({ account });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching live account", error: err.message });
  }
};

export const updateDemoBalance = async (req, res) => {
  const { userId } = req.params;
  const { balance } = req.body;

  try {
    const account = await DemoAccount.findOne({ user: userId });
    if (!account) {
      return res.status(404).json({ message: "Live account not found" });
    }

    account.balance = balance;
    await account.save();

    res.status(200).json({ message: "Balance updated successfully", account });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating balance", error: err.message });
  }
};

export const demowithdraw = async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;

  try {
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount" });
    }

    const demoAccount = await DemoAccount.findOne({ user: userId });
    if (!demoAccount) {
      return res.status(404).json({ message: "Live account not found" });
    }

    if (demoAccount.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    demoAccount.balance -= amount;

    const newTransaction = await DemoTransaction.create({
      user: userId,
      type: "withdrawal",
      amount,
      status: "success",
      description: "Withdraw to demo account",
    });

    demoAccount.transactions.push(newTransaction._id);

    await demoAccount.save();

    res
      .status(200)
      .json({ message: "Withdrawal successful", balance: demoAccount.balance });
  } catch (err) {
    console.error("Error during withdrawal:", err.message);
    res
      .status(500)
      .json({ message: "Error processing withdrawal", error: err.message });
  }
};

export const demodeposit = async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;

  try {
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid deposit amount" });
    }
    const demoAccount = await DemoAccount.findOne({ user: userId });
    if (!demoAccount) {
      return res.status(404).json({ message: "Demo account not found" });
    }

    demoAccount.balance += amount;

    const newTransaction = await DemoTransaction.create({
      user: userId,
      type: "deposit",
      amount,
      status: "success",
      description: "Deposit to demo account",
    });

    demoAccount.transactions.push(newTransaction._id);

    await demoAccount.save();

    res.status(200).json({
      message: "Deposit successful",
      balance: demoAccount.balance,
      transaction: newTransaction,
    });
  } catch (error) {
    console.error("Error during deposit:", error.message);
    res
      .status(500)
      .json({ message: "Error processing deposit", error: error.message });
  }
};
export const getUserAmount = async (req, res) => {
  try {
    const { userId } = req.params; // Get user ID from request params
    const user = await User.findById(userId).select("amount"); // Fetch only the amount field

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ amount: user.amount });
  } catch (error) {
    console.error("Error fetching amount:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getLiveTransactionById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const transactions = await LiveTransaction.find({ user: userId }).sort({
      createdAt: -1,
    });

    if (!transactions.length) {
      return res
        .status(404)
        .json({ message: "No transactions found for this user" });
    }

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
