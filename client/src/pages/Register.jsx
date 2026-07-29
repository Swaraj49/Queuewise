import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/auth/register', { name, email, password, role });
      
      login({
        _id: res.data._id,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role
      }, res.data.token);

      if (res.data.role === 'owner') {
        navigate('/owner/dashboard/queue');
      } else {
        navigate('/discover');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join Queuewise to manage your time better.</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter your name"
              required 
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Enter your email"
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Create a password"
              required 
            />
          </div>
          <div className="form-group">
            <label>I want to...</label>
            <div className="role-selector">
              <label className={`role-option ${role === 'customer' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="customer" 
                  checked={role === 'customer'} 
                  onChange={() => setRole('customer')} 
                />
                Join Queues (Customer)
              </label>
              <label className={`role-option ${role === 'owner' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="owner" 
                  checked={role === 'owner'} 
                  onChange={() => setRole('owner')} 
                />
                Manage a Business (Owner)
              </label>
            </div>
          </div>
          <button type="submit" className="primary-btn">Sign Up</button>
        </form>
        
        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
