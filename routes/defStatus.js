const express = require('express');
const router = express.Router();
const pool = require('../config/db.js'); // Adjust the path if necessary
const logger = require('../utils/logger.js'); // Import your logger if used

// GET all statuses
router.get('/defStatus', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [investments] = await connection.query('SELECT * FROM Def_Status WHERE Active = ?', ['Y']);
    res.status(200).json(investments);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

module.exports = router;