const webpush = require('web-push');
const { pool } = require('../db');

webpush.setVapidDetails(
  'mailto:support@kishtech.co.ke',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

const getVapidPublicKey = async (req, res) => {
  return res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || ''
  });
};

const saveSubscription = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint and keys are required'
      });
    }

    // Check if subscription already exists
    const existing = await pool.query(
      'SELECT id FROM push_subscriptions WHERE endpoint = $1',
      [endpoint]
    );

    if (existing.rows.length === 0) {
      await pool.query(
        'INSERT INTO push_subscriptions (endpoint, keys) VALUES ($1, $2)',
        [endpoint, JSON.stringify(keys)]
      );
      console.log('✅ New push subscription saved');
    }

    return res.status(201).json({
      success: true,
      message: 'Subscription saved successfully'
    });

  } catch (error) {
    console.error('Save subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save subscription'
    });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { title, body, url } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required'
      });
    }

    // Get all subscriptions
    const result = await pool.query(
      'SELECT id, endpoint, keys FROM push_subscriptions'
    );

    const subscriptions = result.rows;
    const payload = JSON.stringify({
      title: title || 'eFootball League',
      body: body || 'New update available!',
      url: url || '/'
    });

    const failed = [];

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys
          },
          payload
        );
      } catch (err) {
        console.error('Failed to send notification:', err.message);
        failed.push(sub.id);
        
        // Remove invalid subscriptions
        if (err.statusCode === 410) {
          await pool.query(
            'DELETE FROM push_subscriptions WHERE id = $1',
            [sub.id]
          );
        }
      }
    }

    // Log notification
    await pool.query(
      'INSERT INTO notifications (title, body, url) VALUES ($1, $2, $3)',
      [title, body, url || null]
    );

    return res.json({
      success: true,
      message: 'Notifications sent',
      totalCount: subscriptions.length,
      failedCount: failed.length
    });

  } catch (error) {
    console.error('Send notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notifications'
    });
  }
};

module.exports = {
  getVapidPublicKey,
  saveSubscription,
  sendNotification
};
