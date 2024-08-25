const express = require('express');
const router = express.Router();
const pool = require('../config/db.js'); // Adjust the path if necessary
const logger = require('../utils/logger.js'); // Import your logger if used

// GET all investments with investor and project names
router.get('/investments_with_details', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const query = `
          SELECT 
    i.Investment_ID, 
    i.Project_ID, 
    p.Title AS Project_Title, 
    i.Investor_ID, 
    inv.Name AS Investor_Name, 
    i.Investment_Amount, 
    i.Investment_Date, 
    i.Active 
FROM 
    Project_Investments i
JOIN 
    Projects p ON i.Project_ID = p.Project_ID
JOIN 
    Investors inv ON i.Investor_ID = inv.Investor_ID
WHERE 
    i.Active = 'Y';

      `;
    const [results] = await connection.query(query);
    res.status(200).json(results);
  } catch (error) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// GET a single investment by ID with investor and project names
router.get('/investments/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const query = `
          SELECT 
              i.Investment_ID, 
              i.Project_ID, 
              p.Title AS Project_Title, 
              i.Investor_ID, 
              inv.Name AS Investor_Name, 
              i.Investment_Amount, 
              i.Investment_Date, 
              i.Active 
          FROM 
              Project_Investments i
          JOIN 
              Projects p ON i.Project_ID = p.Project_ID
          JOIN 
              Investors inv ON i.Investor_ID = inv.Investor_ID
          WHERE 
              i.Investment_ID = ? AND i.Active = 'Y'
      `;
    const [results] = await connection.query(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Investment not found or inactive.' });
    }

    res.status(200).json(results[0]);
  } catch (error) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// POST a new investment
router.post('/investments', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { Project_ID, Investor_ID, Investment_Amount, Investment_Date } = req.body;

    if (!Project_ID || !Investor_ID || !Investment_Amount || !Investment_Date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const query = `
          INSERT INTO Project_Investments 
          (Project_ID, Investor_ID, Investment_Amount, Investment_Date, Active) 
          VALUES (?, ?, ?, ?, 'Y')
      `;
    const [result] = await connection.query(query, [Project_ID, Investor_ID, Investment_Amount, Investment_Date]);

    const newInvestment = {
      Investment_ID: result.insertId,
      Project_ID,
      Investor_ID,
      Investment_Amount,
      Investment_Date,
      Active: 'Y'
    };

    res.status(201).json(newInvestment);
  } catch (error) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// PUT to update an investment by ID
router.put('/investments/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { Project_ID, Investor_ID, Investment_Amount, Investment_Date, Active } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (Project_ID) {
      updateFields.push('Project_ID = ?');
      updateValues.push(Project_ID);
    }
    if (Investor_ID) {
      updateFields.push('Investor_ID = ?');
      updateValues.push(Investor_ID);
    }
    if (Investment_Amount) {
      updateFields.push('Investment_Amount = ?');
      updateValues.push(Investment_Amount);
    }
    if (Investment_Date) {
      updateFields.push('Investment_Date = ?');
      updateValues.push(Investment_Date);
    }
    if (Active) {
      updateFields.push('Active = ?');
      updateValues.push(Active);
    }

    updateValues.push(id);

    const query = `UPDATE Project_Investments SET ${updateFields.join(', ')} WHERE Investment_ID = ?`;
    const [result] = await connection.query(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Investment not found or no changes made.' });
    }

    res.status(200).json({ message: 'Investment updated successfully.' });
  } catch (error) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// DELETE (soft delete) an investment by ID
router.delete('/investments/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const query = 'UPDATE Project_Investments SET Active = "N" WHERE Investment_ID = ?';
    const [result] = await connection.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Investment not found or already inactive.' });
    }

    res.status(200).json({ message: 'Investment deactivated successfully.' });
  } catch (error) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

module.exports = router;
