const express = require('express');
const router = express.Router();
const pool = require('../config/db.js'); // Adjust the path if necessary
const logger = require('../utils/logger.js'); // Import your logger if used

// GET /api/statuses - Retrieve all statuses
router.get('/statuses', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const [statuses] = await connection.query('SELECT * FROM ProjectStatuses');
        res.status(200).json(statuses);
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});

// GET /api/statuses/:id - Retrieve statuses for a specific project
router.get('/statuses/:id', async (req, res) => {
    const connection = await pool.getConnection();
    const { id } = req.params;

    try {
        const [statuses] = await connection.query(
            'SELECT * FROM ProjectStatuses WHERE Project_ID = ? ORDER BY Status_Timestamp DESC',
            [id]
        );

        if (statuses.length > 0) {
            res.status(200).json(statuses);
        } else {
            res.status(404).json({ message: 'No statuses found for this project' });
        }
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});

// POST /api/statuses - Add a new status
router.post('/statuses', async (req, res) => {
    const connection = await pool.getConnection();
    const { Project_ID, Status } = req.body;

    try {
        await connection.query(
            'INSERT INTO ProjectStatuses (Project_ID, Status, Status_Timestamp) VALUES (?, ?, NOW())',
            [Project_ID, Status]
        );

        res.status(201).json({ message: 'Status added successfully' });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});

// PUT /api/statuses/:id - Update an existing status (not commonly used for status updates, but included for completeness)
router.put('/statuses/:id', async (req, res) => {
    const connection = await pool.getConnection();
    const { id } = req.params;
    const { Status } = req.body;

    try {
        // Updating statuses is uncommon since status updates are usually appended
        // If updating is necessary, you might want to adjust the table design or constraints
        const [result] = await connection.query(
            'UPDATE ProjectStatuses SET Status = ?, Status_Timestamp = NOW() WHERE Status_ID = ?',
            [Status, id]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Status updated successfully' });
        } else {
            res.status(404).json({ message: 'Status not found' });
        }
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});

// DELETE /api/statuses/:id - Delete a status by ID
router.delete('/statuses/:id', async (req, res) => {
    const connection = await pool.getConnection();
    const { id } = req.params;

    try {
        const [result] = await connection.query('DELETE FROM ProjectStatuses WHERE Status_ID = ?', [id]);

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Status deleted successfully' });
        } else {
            res.status(404).json({ message: 'Status not found' });
        }
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});

module.exports = router;
