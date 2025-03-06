import express from 'express';
import { createDemoAccount, createLiveAccount, demodeposit, demowithdraw, deposit, getDemoAccount, getLiveAccount, getLiveTransactionById, innerLogin, updateBalance, updateDemoBalance, withdraw } from './../../controllers/accountController.js';
import { authenticateToken, authorizeRole } from '../../middleware/auth/auth.js';
import { addDemoTransaction } from '../../controllers/UserTransaction.js';


const router = express.Router();

//Live Account

router.post('/create', authenticateToken, authorizeRole('user'), createLiveAccount);
router.post('/innerlogin', authenticateToken,innerLogin);

router.get('/:userId', authenticateToken, authorizeRole('user'), getLiveAccount);

router.put('/:userId/balance', authenticateToken, authorizeRole('user'), updateBalance);

router.post('/:userId/withdraw', authenticateToken, withdraw);

router.post('/:userId/deposit', authenticateToken, deposit);
router.get('/transaction/:userId',  authenticateToken , getLiveTransactionById)

// Demo Account 

router.post('/createdemo', authenticateToken, authorizeRole('user'), createDemoAccount);

router.get('/demo/:userId', authenticateToken, authorizeRole('user'), getDemoAccount);

router.put('/demo/:userId/balance', authenticateToken, authorizeRole('user'), updateDemoBalance);

router.put('/demo/:userId/withdraw', authenticateToken, demowithdraw);

router.put('/demo/:userId/deposit', authenticateToken, demodeposit);


// Testing 

router.post('/transaction', authenticateToken, addDemoTransaction);



export default router;
