const express = require('express');
const router = express.Router();
const pool = require('../config/db.js'); // Adjust the path if necessary
const logger = require('../utils/logger.js'); // Import your logger if used

router.get('/dashboard/total-active-investment', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const result = await connection.query(`
          SELECT 
              SUM(CASE WHEN pi.Active = 'Y' THEN pi.Investment_Amount ELSE 0 END) AS Total_Investment,
              SUM(CASE WHEN pi.Active = 'Y' AND ds.Percentage_Completion < 100 THEN pi.Investment_Amount ELSE 0 END) AS Active_Investment
          FROM 
              Project_Investments pi
          JOIN 
              Projects p ON pi.Project_ID = p.Project_ID
          JOIN 
              Project_Statuses ps ON p.Project_ID = ps.Project_ID
          JOIN 
              Def_Status ds ON ps.Status_ID = ds.Status_ID
          WHERE 
              ps.Status_Date = (
                  SELECT MAX(Status_Date)
                  FROM Project_Statuses
                  WHERE Project_ID = p.Project_ID
              );
      `);
    res.json(result[0]);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

router.get('/dashboard/total-active-investors', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const result = await connection.query(`
          SELECT 
              COUNT(DISTINCT pi.Investor_ID) AS Total_Investors,
              COUNT(DISTINCT CASE WHEN ds.Percentage_Completion < 100 THEN pi.Investor_ID ELSE NULL END) AS Active_Investors
          FROM 
              Project_Investments pi
          JOIN 
              Projects p ON pi.Project_ID = p.Project_ID and p.Active = 'Y'
          JOIN 
              Project_Statuses ps ON p.Project_ID = ps.Project_ID
          JOIN 
              Def_Status ds ON ps.Status_ID = ds.Status_ID and ds.Active = 'Y'
          WHERE 
              ps.Status_Date = (
                  SELECT MAX(Status_Date)
                  FROM Project_Statuses
                  WHERE Project_ID = p.Project_ID
              );
      `);
    res.json(result[0]);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

router.get('/dashboard/total-active-projects', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const result = await connection.query(`
          SELECT 
              COUNT(p.Project_ID) AS Total_Projects,
              COUNT(CASE WHEN ds.Percentage_Completion < 100 THEN p.Project_ID ELSE NULL END) AS Active_Projects
          FROM 
              Projects p
          JOIN 
              Project_Statuses ps ON p.Project_ID = ps.Project_ID
          JOIN 
              Def_Status ds ON ps.Status_ID = ds.Status_ID
          WHERE 
              p.Active = 'Y'
              AND ps.Status_Date = (
                  SELECT MAX(Status_Date)
                  FROM Project_Statuses
                  WHERE Project_ID = p.Project_ID
              );
      `);
    res.json(result[0]);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

module.exports = router;
