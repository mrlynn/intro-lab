import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Chatbot.css';

const Chatbot = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const populateInput = (text) => {
    setInputValue(text);
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    const newMessages = [...messages, { text: inputValue, isUser: true }];
    setMessages(newMessages);
    setInputValue('');

    try {
      const response = await axios.post('http://localhost:3001/api/chat', { query: inputValue });
      const reply = response.data.reply;
      setMessages([...newMessages, { text: reply, isUser: false }]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="chatbot">
      <div className="sidebar">
        <div className="sidebar-item">
          <a href="https://mongodb-developer.github.io/intro-lab/">Intro Lab</a>
        </div>
        <div className="sidebar-item">
          <a href="https://mongodb-developer.github.io/search-lab/">Search Lab</a>
        </div>
        <div className="sidebar-item">
          <a href="https://mongodb-developer.github.io/intro-lab/chat">Chatbot</a>
        </div>
      </div>
      <div className="chat-container">
        <div className="example-questions">
          <a href="#" onClick={() => populateInput('Why does the library application display no books?')}>
            1. Why does the library application display no books?
          </a>
          <a href="#" onClick={() => populateInput("Why can't my application connect to my Atlas Cluster?")}>
            2. Why can't my application connect to my Atlas Cluster?
          </a>
          <a href="#" onClick={() => populateInput('How do I restart codespaces?')}>
            3. How do I restart codespaces?
          </a>
        </div>
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.isUser ? 'user-message' : 'bot-message'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.text}
              </ReactMarkdown>
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type your message..."
            id="chatInput"
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
