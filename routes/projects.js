const express = require('express');
const router = express.Router();
const pool = require('../config/db.js'); // Adjust the path if necessary
const logger = require('../utils/logger.js'); // Import your logger if used

// GET /api/projects - Retrieve all projects
router.get('/projects', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [projects] = await connection.query('SELECT * FROM Projects WHERE Active = ?', ['Y']);
    res.status(200).json(projects || []);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

router.get('/projects_with_status', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const query = `
          SELECT 
    p.Project_ID,
    p.Title,
    p.Description,
    ps.Status_ID,
    ds.Status,
    ds.Percentage_Completion,
    ps.Status_Date,
    COALESCE(SUM(pi.Investment_Amount), 0) AS Total_Investment,
    COALESCE(COUNT(DISTINCT pi.Investor_ID), 0) AS Total_Unique_Investors
FROM 
    Projects p
JOIN 
    Project_Statuses ps ON p.Project_ID = ps.Project_ID
JOIN 
    Def_Status ds ON ps.Status_ID = ds.Status_ID
LEFT JOIN 
    Project_Investments pi ON p.Project_ID = pi.Project_ID AND pi.Active = 'Y'
WHERE 
    p.Active = 'Y'
    AND ps.Status_Date = (
        SELECT MAX(Status_Date)
        FROM Project_Statuses
        WHERE Project_ID = p.Project_ID
    )
GROUP BY 
    p.Project_ID, p.Title, p.Description, ps.Status_ID, ds.Status, ps.Status_Date
ORDER BY 
    ps.Status_Date DESC;

      `;
    const [results] = await connection.query(query);
    res.status(200).json(results);
  } catch (error) {
    logger.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release();
  }
});

// GET /api/projects - Retrieve all projects
router.get('/projects', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [projects] = await connection.query('SELECT * FROM Projects WHERE Active = ?', ['Y']);
    res.status(200).json(projects || []);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// GET /api/projects/:id - Get project by ID with the latest status
router.get('/projects/:id', async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;

  try {
    const selectQuery = `
          SELECT p.*, ps.Status_ID, ps.Status_Date, ds.Status, ds.Percentage_Completion
          FROM Projects p
          LEFT JOIN Project_Statuses ps ON p.Project_ID = ps.Project_ID
          LEFT JOIN Def_Status ds ON ps.Status_ID = ds.Status_ID
          WHERE p.Project_ID = ? 
          ORDER BY ps.Status_Date DESC 
          LIMIT 1;
      `;
    const [project] = await connection.query(selectQuery, [id]);

    if (project.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json(project[0]);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// POST /api/projects - Add a new project
router.post('/projects', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { Title, Description, Commencement_Date } = req.body;

    if (!Title || !Commencement_Date) {
      return res.status(400).json({ message: 'Title and Commencement Date are required.' });
    }

    // Insert the new project
    const insertProjectQuery = `
          INSERT INTO Projects (Title, Description, Active)
          VALUES (?, ?, ?);
      `;
    const [insertResult] = await connection.query(insertProjectQuery, [Title, Description, 'Y']);

    const projectId = insertResult.insertId;

    // Insert the first status in Project_Statuses table with Status_ID = 1
    const insertStatusQuery = `
          INSERT INTO Project_Statuses (Project_ID, Status_ID, Status_Date)
          VALUES (?, ?, ?);
      `;
    await connection.query(insertStatusQuery, [projectId, 1, Commencement_Date]);

    // Retrieve the newly added project with the initial status
    const selectQuery = `
          SELECT p.*, ps.Status_ID, ps.Status_Date
          FROM Projects p
          LEFT JOIN Project_Statuses ps ON p.Project_ID = ps.Project_ID
          WHERE p.Project_ID = ? ORDER BY ps.Status_Date DESC LIMIT 1;
      `;
    const [newProject] = await connection.query(selectQuery, [projectId]);

    // Return the new project row as JSON
    res.status(201).json(newProject[0]);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// PUT /api/projects/:id - Update an existing project
router.put('/projects/:id', async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;

  try {
    const { Title, Description, Status_ID, Status_Date } = req.body;

    if (!Title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    // Update the project details
    const updateProjectQuery = `
          UPDATE Projects
          SET Title = ?, Description = ?
          WHERE Project_ID = ?;
      `;
    await connection.query(updateProjectQuery, [Title, Description, id]);

    // Insert a new status only if Status_ID and Status_Date are provided and valid
    if (Status_ID && Status_Date) {
      // Get the latest status for comparison
      const selectStatusQuery = `
              SELECT * FROM Project_Statuses
              WHERE Project_ID = ? 
              ORDER BY Status_Date DESC 
              LIMIT 1;
          `;
      const [latestStatus] = await connection.query(selectStatusQuery, [id]);

      // Insert a new status only if the new status is different from the latest one
      if (latestStatus.length === 0 || latestStatus[0].Status_ID !== Status_ID) {
        const insertStatusQuery = `
                  INSERT INTO Project_Statuses (Project_ID, Status_ID, Status_Date)
                  VALUES (?, ?, ?);
              `;
        await connection.query(insertStatusQuery, [id, Status_ID, Status_Date]);
      }
    }

    // Return the updated project with the latest status
    const selectQuery = `
          SELECT p.*, ps.Status_ID, ps.Status_Date
          FROM Projects p
          LEFT JOIN Project_Statuses ps ON p.Project_ID = ps.Project_ID
          WHERE p.Project_ID = ? ORDER BY ps.Status_Date DESC LIMIT 1;
      `;
    const [updatedProject] = await connection.query(selectQuery, [id]);

    res.status(200).json(updatedProject[0]);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// DELETE /api/projects/:id - Soft delete a project
router.delete('/projects/:id', async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;

  try {
    const [result] = await connection.query(
      'UPDATE Projects SET Active = "N" WHERE Project_ID = ?',
      [id]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Project deactivated successfully' });
    } else {
      res.status(404).json({ message: 'Project not found or already deactivated' });
    }
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

module.exports = router;
