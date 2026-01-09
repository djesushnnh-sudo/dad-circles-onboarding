import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChatInterface } from './components/ChatInterface';
import { AdminDashboard } from './components/AdminDashboard';
import LandingPage from './components/LandingPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Landing page - no layout wrapper */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Admin routes - with layout */}
        <Route path="/admin/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/chat" element={<ChatInterface />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
};

export default App;