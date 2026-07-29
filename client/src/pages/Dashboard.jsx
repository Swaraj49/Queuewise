import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const Dashboard = () => {
  useEffect(() => {
    // Example socket.io connection setup
    const socket = io("http://localhost:5000");
    
    socket.on("connect", () => {
      console.log("Connected to server via socket.io");
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Dashboard</h1>
      <p>This is the dashboard placeholder page.</p>
      <div>
        <Link to="/login">Logout</Link>
      </div>
    </div>
  );
};

export default Dashboard;
