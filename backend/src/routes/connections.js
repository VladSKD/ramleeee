const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClients');
const requireAuth = require('../middleware/requireAuth');

// Отримати всі вхідні запити
router.get('/incoming', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('connections')
    .select('id, sender_id, profiles!sender_id(full_name, avatar_url)')
    .eq('receiver_id', req.user.id)
    .eq('status', 'pending');

  if (error) return res.status(400).json(error);
  res.json(data);
});

// Прийняти запит
router.patch('/respond', requireAuth, async (req, res) => {
  const { connectionId, status } = req.body; // status: 'accepted' або 'rejected'
  const { data, error } = await supabaseAdmin
    .from('connections')
    .update({ status })
    .eq('id', connectionId)
    .eq('receiver_id', req.user.id);

  if (error) return res.status(400).json(error);
  res.json({ message: `Запит ${status}` });
});

module.exports = router;