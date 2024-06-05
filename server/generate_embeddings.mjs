import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';
import markdownIt from 'markdown-it';
import { fileURLToPath } from 'url';

const md = new markdownIt();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '../docs');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbeddings(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error.response ? error.response.data : error.message);
    throw error;
  }
}

function convertMarkdownToText(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return md.render(fileContent);
}

function getAllMarkdownFiles(dirPath) {
  let files = [];
  fs.readdirSync(dirPath).forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      files = files.concat(getAllMarkdownFiles(filePath));
    } else if (filePath.endsWith('.mdx')) {
      files.push(filePath);
    }
  });
  return files;
}

async function processDocuments() {
  const markdownFiles = getAllMarkdownFiles(docsDir);
  console.log(`Found ${markdownFiles.length} Markdown files.`);
  
  const documents = [];

  for (let file of markdownFiles) {
    const content = convertMarkdownToText(file);
    console.log(`Processing file: ${file}`);
    const embedding = await generateEmbeddings(content);
    documents.push({ file, content, embedding });
  }

  if (documents.length === 0) {
    console.log('No documents to insert.');
    return;
  }

  const client = new MongoClient(process.env.MONGODB_URL);
  await client.connect();
  const db = client.db('chatbot');
  const collection = db.collection('documents');

  await collection.insertMany(documents);
  await client.close();
}

processDocuments()
  .then(() => console.log('Documents processed and stored successfully'))
  .catch(error => console.error('Error processing documents:', error));
