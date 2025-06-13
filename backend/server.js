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

    if (!key) return res.status(400).json({ error: 'No file key provided' });
    
    try {
        // Fetch log file from S3
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
        };

        const data = await s3.getObject(params).promise();
        const logContent = data.Body.toString('utf-8');

        // Send to OpenAI for analysis
        const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
                { role: "system", content: "You are a helpful assistant that specializes in analyzing system logs." },
                { role: "user", content: `Analyze this log file:\n\n${logContent}` }
            ],
        });

        res.json({ result: response.choices[0].message.content });
    } catch (err) {
        res.status(500).json({ error: 'Failed to analyze log', details: err.message });
    }
});

// List files endpoint
app.get('/files', async (req, res) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    const files = data.Contents.map(file => ({
      key: file.Key,
      lastModified: file.LastModified,
      size: file.Size,
    }));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list files', details: err.message });
  }
});

// TODO: Delete file endpoint


const PORT = process.env.PORT || 3200;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


