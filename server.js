require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config(); // ✅ Load env vars first
const connectDB = require('./config/db');

const app = express();
// app.use(express.json());
// app.use(bodyParser.json()); 
app.use(bodyParser.json({ limit: '5mb' }));

console.log("JWT_SECRET:", process.env.JWT_SECRET); // ✅ This will now log the correct value

// Existing Routes
const postRoutes = require('./routes/postRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
//const scheduledRoutes = require('./routes/scheduledRoutes');
const { sendBulkEmail } = require('./controllers/emailController');


// ✅ Auth Route
const authRoutes = require('./routes/authRoutes');

const schedulePosts = require('./cron/scheduler');

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/post', postRoutes);
app.use('/api/upload', uploadRoutes);
//app.use('/api/scheduler', scheduledRoutes);
app.use('/api/auth', authRoutes); // ✅ Auth routes added
app.post('/api/send-email', sendBulkEmail);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
