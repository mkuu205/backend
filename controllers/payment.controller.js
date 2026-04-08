const { pool } = require('../db');
const { successResponse, errorResponse } = require('../utils/responses');

const createPayment = async (req, res) => {
  try {
    const { amount, transaction_code, payment_type, description } = req.body;
    const userId = req.user.userId;

    if (!amount || amount <= 0) {
      return errorResponse(res, 'Valid amount is required', 400);
    }

    const result = await pool.query(
      `INSERT INTO payments (user_id, amount, transaction_code, payment_type, description, status) 
       VALUES ($1, $2, $3, $4, $5, 'pending') 
       RETURNING *`,
      [userId, amount, transaction_code || null, payment_type || 'tournament_entry', description || null]
    );

    return successResponse(res, 'Payment created', { payment: result.rows[0] }, 201);

  } catch (error) {
    console.error('Create payment error:', error);
    return errorResponse(res, 'Failed to create payment', 500);
  }
};

const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, amount, status, transaction_code, payment_type, description, created_at, completed_at 
       FROM payments 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return successResponse(res, 'Payments retrieved', {
      payments: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get payments error:', error);
    return errorResponse(res, 'Failed to load payments', 500);
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'failed'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const completedAt = status === 'completed' ? 'CURRENT_TIMESTAMP' : null;

    const result = await pool.query(
      `UPDATE payments 
       SET status = $1, completed_at = ${completedAt ? 'NOW()' : 'completed_at'} 
       WHERE id = $2 
       RETURNING *`,
      [status, paymentId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Payment not found', 404);
    }

    return successResponse(res, 'Payment status updated', { payment: result.rows[0] });

  } catch (error) {
    console.error('Update payment error:', error);
    return errorResponse(res, 'Failed to update payment', 500);
  }
};

module.exports = {
  createPayment,
  getUserPayments,
  updatePaymentStatus
};
