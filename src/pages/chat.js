// ChatPage.js
import React from 'react';
import Layout from '@theme/Layout';
import Chatbot from '../components/Chatbot';
import './ChatPage.css';

const ChatPage = () => (
  <Layout title="Chat with AI">
    <div className="chat-container">
      <Chatbot />
    </div>
  </Layout>
);

export default ChatPage;
