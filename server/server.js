import 'dotenv/config';
import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
});

// Utility function to log messages to a file
function logToFile(message) {
  const logPath = path.join(__dirname, 'chatbot.log');
  fs.appendFileSync(logPath, `${new Date().toISOString()} - ${message}\n`);
}

async function generateEmbeddings(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    logToFile(`Sending data to AI: ${text}`);
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error.response ? error.response.data : error.message);
    logToFile(`Error generating embeddings: ${error.message}`);
    throw error;
  }
}

async function findRelevantDocuments(query) {
  const queryEmbedding = await generateEmbeddings(query);
  logToFile(`Generated query embedding: ${queryEmbedding}`);

  const client = new MongoClient(process.env.MONGODB_URL);
  await client.connect();
  const db = client.db('chatbot');
  const collection = db.collection('documents');

  const documents = await collection.aggregate([
    {
      $vectorSearch: {
        index: 'default',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: 10,
        limit: 10
      }
    }
  ]).toArray();

  await client.close();
  logToFile(`Found ${documents.length} relevant documents`);

  return documents;
}

async function getChatCompletion(messages) {
  try {
    logToFile(`Generating chat completion for messages: ${JSON.stringify(messages)}`);
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
    });

    const completion = response.choices[0].message.content;
    logToFile(`Generated chat completion: ${completion}`);
    return completion;
  } catch (error) {
    console.error('Error generating chat completion:', error.response ? error.response.data : error.message);
    logToFile(`Error generating chat completion: ${error.message}`);
    throw error;
  }
}

// Helper function to summarize or truncate context
function getSummarizedContext(documents, maxTokens = 7000) {
  let context = '';
  let tokens = 0;

  for (const doc of documents) {
    const contentTokens = doc.content.split(' ').length;
    if (tokens + contentTokens <= maxTokens) {
      context += doc.content + '\n\n';
      tokens += contentTokens;
    } else {
      break;
    }
  }

  return context;
}

// Endpoint to serve the sidebar
app.get('/api/sidebar', async (req, res) => {
  try {
    const sidebarConfig = await getSidebarConfig();
    res.json({ sidebar: sidebarConfig });
  } catch (error) {
    console.error('Error fetching sidebar:', error.message);
    res.status(500).json({ error: 'Failed to load sidebar configuration' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { query } = req.body;
  try {
    const relevantDocuments = await findRelevantDocuments(query);
    const context = getSummarizedContext(relevantDocuments);
    logToFile(`Context for chat completion: ${context.substring(0, 500)}...`);
    
    const messages = [
      { role: 'system', content: 'You are a helpful assistant working as part of delivery of a MongoDB Developer Days workshop. Attendees will ask questions about the workshop content and about getting the project working. You should search for relevant answers in the local database.' },
      { role: 'user', content: query },
      { role: 'system', content: context }
    ];
    
    const reply = await getChatCompletion(messages);
    res.json({ reply });
  } catch (error) {
    console.error('Error processing chat:', error);
    logToFile(`Error processing chat: ${error.message}`);
    res.status(500).json({ error: 'Error processing chat' });
  }
});

// Function to read sidebar configuration using dynamic import
async function getSidebarConfig() {
  const sidebarPath = path.join(__dirname, '../sidebars.js');
  console.log(`Reading sidebar configuration from: ${sidebarPath}`);
  if (fs.existsSync(sidebarPath)) {
    const { default: sidebarConfig } = await import(sidebarPath);
    console.log('Sidebar configuration loaded successfully');
    return sidebarConfig;
  } else {
    console.error('Sidebar configuration file not found');
    throw new Error('Sidebar configuration file not found');
  }
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  logToFile(`Server started on port ${port}`);
});
