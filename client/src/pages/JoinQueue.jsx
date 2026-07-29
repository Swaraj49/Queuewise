import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const JoinQueue = () => {
  const { businessId } = useParams();
  const { token, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [joining, setJoining] = useState(true);
  const [error, setError] = useState('');
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!token) {
      // User is not logged in - redirect to login and return here after login
      navigate('/login', { 
        replace: true, 
        state: { from: location.pathname } 
      });
      return;
    }

    if (attemptedRef.current) return;
    attemptedRef.current = true;

    // User is logged in - attempt to join queue immediately
    const autoJoin = async () => {
      try {
        setJoining(true);
        await axios.post(`/queue/join/${businessId}`);
        navigate(`/queue-status/${businessId}`, { replace: true });
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to join queue';
        if (msg === 'You are already waiting in this queue') {
          navigate(`/queue-status/${businessId}`, { replace: true });
        } else {
          setError(msg);
          setJoining(false);
        }
      }
    };

    autoJoin();
  }, [token, loading, businessId, navigate, location.pathname]);

  return (
    <div className="auth-container">
      <div className="glass-panel text-center">
        <h1 className="auth-title">Instant Queue Join</h1>
        {joining ? (
          <div>
            <p className="auth-subtitle" style={{ marginBottom: '16px' }}>Joining the queue for your visit...</p>
            <div className="loading-spinner" style={{ fontSize: '24px' }}>⏳</div>
          </div>
        ) : error ? (
          <div>
            <div className="auth-error">{error}</div>
            <button 
              className="primary-btn" 
              onClick={() => navigate('/discover')}
              style={{ marginTop: '16px' }}
            >
              Go to Discover
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default JoinQueue;
