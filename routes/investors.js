const express = require('express');
const router = express.Router();
const pool = require('../config/db.js'); // Adjust the path if necessary
const logger = require('../utils/logger.js'); // Import your logger if used

// GET /api/investors - Retrieve all investors
router.get('/investors', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [investors] = await connection.query('SELECT * FROM Investors WHERE Active = ?', ['Y']);
    res.status(200).json(investors ? investors : []);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// GET /api/investors/:id - Retrieve a specific investor
router.get('/investors/:id', async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;

  try {
    const [investor] = await connection.query(
      'SELECT * FROM Investors WHERE Investor_ID = ? AND Active = ?',
      [id, 'Y']
    );

    if (investor.length > 0) {
      res.status(200).json(investor[0]);
    } else {
      res.status(404).json({ message: 'Investor not found' });
    }
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// GET /investors_with_details - Returns investors with additional details
router.get('/investors_with_details', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const query = `
          WITH Latest_Status AS (
    SELECT 
        ps.Project_ID, 
        MAX(ps.Status_Date) AS Latest_Status_Date
    FROM 
        Project_Statuses ps
    GROUP BY 
        ps.Project_ID
),
Project_Def_Status AS (
    SELECT 
        ps.Project_ID, 
        ps.Status_ID, 
        ds.Percentage_Completion
    FROM 
        Project_Statuses ps
    JOIN 
        Def_Status ds ON ps.Status_ID = ds.Status_ID
    JOIN 
        Latest_Status ls ON ps.Project_ID = ls.Project_ID AND ps.Status_Date = ls.Latest_Status_Date
)
SELECT 
    i.Investor_ID,
    i.Name,
    i.Contact_Number,
    i.Address,
    i.Alias,
    COUNT(DISTINCT pi.Project_ID) AS Total_Projects,
    COUNT(DISTINCT CASE WHEN pds.Percentage_Completion < 100 THEN pi.Project_ID ELSE NULL END) AS Active_Projects,
    COALESCE(SUM(CASE WHEN pds.Percentage_Completion < 100 THEN pi.Investment_Amount ELSE 0 END), 0) AS Active_Investment,
    COALESCE(SUM(pi.Investment_Amount), 0) AS Total_Investment
FROM 
    Investors i
LEFT JOIN 
    Project_Investments pi ON i.Investor_ID = pi.Investor_ID AND pi.Active = 'Y'
LEFT JOIN 
    Projects p ON pi.Project_ID = p.Project_ID
LEFT JOIN 
    Project_Def_Status pds ON p.Project_ID = pds.Project_ID
WHERE 
    i.Active = 'Y'
GROUP BY 
    i.Investor_ID, i.Name, i.Contact_Number, i.Address, i.Alias
ORDER BY 
    i.Name ASC;
      `;

    const [results] = await connection.query(query);
    res.status(200).json(results);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// POST /api/investors - Add a new investor
router.post('/investors', async (req, res) => {
  const connection = await pool.getConnection();
  const { Name, Contact_Number, Address, Alias } = req.body;

  try {
    await connection.query(
      'INSERT INTO Investors (Name, Contact_Number, Address, Alias, Active) VALUES (?, ?, ?, ?, ?)',
      [Name, Contact_Number, Address, Alias, 'Y']
    );

    res.status(201).json({ message: 'Investor added successfully' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// PUT /api/investors/:id - Update an investor
router.put('/investors/:id', async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;
  const { Name, Contact_Number, Address, Alias } = req.body;

  try {
    await connection.query(
      'UPDATE Investors SET Name = ?, Contact_Number = ?, Address = ?, Alias = ? WHERE Investor_ID = ?',
      [Name, Contact_Number, Address, Alias, id]
    );

    res.status(200).json({ message: 'Investor updated successfully' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// DELETE /api/investors/:id - Soft delete an investor
router.delete('/investors/:id', async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;

  try {
    const [result] = await connection.query(
      'UPDATE Investors SET Active = "N" WHERE Investor_ID = ?',
      [id]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Investor deactivated successfully' });
    } else {
      res.status(404).json({ message: 'Investor not found or already deactivated' });
    }
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

module.exports = router;
