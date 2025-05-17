const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const postRoutes = require('./routes/postRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const scheduledRoutes = require('./routes/scheduledRoutes');
const schedulePosts = require('./cron/scheduler');
dotenv.config();

const app = express();
app.use(express.json());
app.use(bodyParser.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/post', postRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/scheduler', scheduledRoutes);



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
