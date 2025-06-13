const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const { OpenAI } = require("openai");
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// AWS S3 configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// OpenAI API configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// File upload endpoint
app.post('/upload', upload.single('logfile'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    let bucketName = process.env.AWS_S3_BUCKET;
  const params = {
    Bucket: bucketName,
    Key: `${Date.now()}_${req.file.originalname}`,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };

  try {
    const data = await s3.upload(params).promise();
    res.json({ url: data.Location, key: data.Key });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload file', details: err.message });
  }
});

// File analysis endpoint
app.post('/analyze', async (req, res) => {
    const { key } = req.body;

    if (!key) {
        return res.status(400).json({ error: 'Missing S3 key to analyze' });
    }
    
    // Fetch the log file from S3
    try {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
        };

        const data = await s3.getObject(params).promise();
        const logContent = data.Body.toString('utf-8');

        const prompt = `Analyze the following system log for errors, warnings, and important events:\n\n${logContent}`;

        const completion = await openai.createChatCompletion({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        });

        const analysis = completion.data.choices[0].message.content;

        res.json({ analysis });
    } catch (err) {
        res.status(500).json({ error: 'Failed to analyze log', details: err.message });
    }

});


const PORT = process.env.PORT || 3200;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


