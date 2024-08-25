require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
// const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const projectRoutes = require('./routes/projects.js');
const investorRoutes = require('./routes/investors.js');
const defStatusRoutes = require('./routes/defStatus.js');
const statusRoutes = require('./routes/statuses.js');
const investmentRoutes = require('./routes/investments.js');

const app = express();

// Error handling
app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(500).json({ message: 'An error occurred' });
});

// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
//     },
//   }),
// );

// app.use(rateLimiter);

// Logging with Morgan and Winston
app.use(morgan('combined')); // Log HTTP requests

// Enable CORS for all origins
app.use(cors());

app.use(bodyParser.json()); // Parse incoming requests with JSON payloads

app.use('/api', projectRoutes);
app.use('/api', investorRoutes);
app.use('/api', statusRoutes);
app.use('/api', defStatusRoutes);
app.use('/api', investmentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  winston.error(err.message, err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start the server
const PORT = 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port: ${PORT}`);
});