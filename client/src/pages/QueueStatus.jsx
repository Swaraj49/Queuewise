import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Bell, BellCheck, Star, CheckCircle2, XCircle, Clock, LogOut, Compass, Send, AlertCircle } from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const QueueStatus = () => {
  const { businessId } = useParams();
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pushStatus, setPushStatus] = useState(''); // 'enabled', 'prompt', 'denied'

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      registerServiceWorkerAndSubscribe();
    }
  }, []);

  const registerServiceWorkerAndSubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      if (Notification.permission === 'granted') {
        await subscribeUserToPush(reg);
        setPushStatus('enabled');
      } else if (Notification.permission === 'default') {
        setPushStatus('prompt');
      } else {
        setPushStatus('denied');
      }
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  };

  const handleEnablePush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        await subscribeUserToPush(reg, true);
        setPushStatus('enabled');
      } else {
        setPushStatus('denied');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const subscribeUserToPush = async (registration, isUserAction = false) => {
    try {
      const res = await axios.get('/notifications/vapid-key');
      const publicKey = res.data.vapidPublicKey;
      if (!publicKey) return;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      }

      await axios.post('/notifications/subscribe', { 
        subscription, 
        isUserAction,
        position: status?.position,
        businessName: status?.businessName
      });
    } catch (err) {
      console.error('Failed to subscribe user to push:', err);
    }
  };

  useEffect(() => {
    // 1. Initial fetch
    fetchStatus();

    // 2. Socket setup
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const socket = io(API_BASE_URL);
    
    // Once connected, join the specific user/business rooms
    socket.on('connect', () => {
      socket.emit('joinRoom', { businessId, userId: user._id });
    });

    // Listen for personal updates
    socket.on('yourPositionUpdated', (data) => {
      setStatus(prev => ({
        ...prev,
        position: data.position,
        estimatedWaitTimeMinutes: data.estimatedWaitTimeMinutes,
        status: data.status || prev.status,
        entryId: data.entryId || prev?.entryId
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [businessId, user._id]);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!status?.entryId) {
      setReviewError('Queue entry ID missing. Please refresh.');
      return;
    }
    setSubmittingReview(true);
    setReviewError('');
    try {
      await axios.post('/reviews', {
        businessId: status.businessId || businessId,
        queueEntryId: status.entryId,
        rating,
        comment
      });
      setReviewSubmitted(true);
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/queue/status/${businessId}`);
      setStatus(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    if (leaving) return;
    try {
      setLeaving(true);
      await axios.post(`/queue/leave/${businessId}`);
      navigate('/discover');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to leave queue');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Queuewise</h2>
        <div className="nav-profile">
          <span>{user?.name}</span>
          <Button variant="ghost" size="sm" icon={LogOut} onClick={logout}>Logout</Button>
        </div>
      </nav>

      <main className="dashboard-content centered-content">
        {loading ? (
          <p>Loading your status...</p>
        ) : error ? (
          <Card className="text-center">
            <h2 className="auth-title">Queue Status</h2>
            <div className="auth-error">{error}</div>
            <Button variant="primary" icon={Compass} onClick={() => navigate('/discover')}>Go Back</Button>
          </Card>
        ) : (
          <Card className="status-panel text-center" style={{ maxWidth: '480px', margin: '0 auto' }}>
            <h2 className="auth-title">{status.businessName}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 16px 0' }}>
              <Badge status={status.status} />
            </div>

            {status.status === 'in-service' ? (
              <div className="status-circle" style={{ borderColor: '#10b981', boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}>
                <span className="position-number" style={{ fontSize: '28px', color: '#10b981' }}>Serving</span>
                <span className="position-label">Service in progress</span>
              </div>
            ) : status.status === 'called' ? (
              <div className="status-circle" style={{ borderColor: '#fbbf24', boxShadow: '0 0 30px rgba(251, 191, 36, 0.3)' }}>
                <span className="position-number" style={{ fontSize: '28px', color: '#fbbf24' }}>Called!</span>
                <span className="position-label">Please proceed</span>
              </div>
            ) : status.status === 'completed' || status.status === 'no-show' ? (
              <div className="status-circle" style={{ borderColor: '#9ca3af', boxShadow: 'none' }}>
                <span className="position-number" style={{ fontSize: '24px', color: '#9ca3af' }}>{status.status === 'completed' ? 'Finished' : 'Skipped'}</span>
              </div>
            ) : (
              <div className="status-circle">
                <span className="position-number">#{status.position}</span>
                <span className="position-label">in line</span>
              </div>
            )}

            {status.status !== 'completed' && status.status !== 'no-show' && (
              <div className="wait-time-box">
                <h3>{status.status === 'in-service' ? 'Spot Secured' : status.status === 'called' ? 'Go to counter now' : 'Estimated Wait'}</h3>
                <p className="time-value" style={{ fontSize: status.status === 'called' ? '18px' : '24px' }}>
                  {status.status === 'in-service' ? 'Now' : status.status === 'called' ? 'Timer is ticking!' : `~${status.estimatedWaitTimeMinutes} mins`}
                </p>
              </div>
            )}

            {status.status === 'waiting' && pushStatus === 'prompt' && (
              <Button
                variant="primary"
                icon={Bell}
                onClick={handleEnablePush}
                style={{ backgroundColor: '#8b5cf6', marginBottom: '16px', width: '100%' }}
              >
                Notify Me When #2 in Line
              </Button>
            )}

            {status.status === 'waiting' && pushStatus === 'enabled' && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '10px', marginBottom: '16px', color: '#10b981', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CheckCircle2 className="w-4 h-4" /> Web Push Active ({status.position === 2 ? "You are #2 in line!" : status.position === 1 ? "You are #1 in line!" : "We'll alert your device at #2"})
              </div>
            )}

            {status.status === 'completed' && (
              <div style={{ marginTop: '20px', marginBottom: '20px', textAlign: 'center' }}>
                {reviewSubmitted ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '12px', padding: '20px' }}>
                    <h3 style={{ color: '#10b981', marginBottom: '8px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Thank You!
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Your review has been submitted successfully.</p>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Rate Your Visit</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>How was your experience at {status.businessName}?</p>

                    {reviewError && <div className="auth-error" style={{ marginBottom: '12px' }}>{reviewError}</div>}

                    <form onSubmit={handleReviewSubmit}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="w-8 h-8 cursor-pointer transition-colors duration-150"
                            style={{
                              color: (hoverRating || rating) >= star ? '#fbbf24' : '#4b5563',
                              fill: (hoverRating || rating) >= star ? '#fbbf24' : 'transparent'
                            }}
                          />
                        ))}
                      </div>

                      <textarea
                        placeholder="Write a brief comment (optional)..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '10px',
                          color: 'white',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          marginBottom: '16px',
                          resize: 'none'
                        }}
                      />

                      <Button 
                        type="submit" 
                        variant="primary" 
                        icon={Send} 
                        isLoading={submittingReview}
                        style={{ margin: 0, width: '100%' }}
                      >
                        Submit Review
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {status.status !== 'completed' && status.status !== 'no-show' ? (
              <Button 
                variant="danger" 
                isLoading={leaving} 
                onClick={handleLeave} 
                style={{ width: '100%', marginTop: '12px' }}
              >
                Leave Queue
              </Button>
            ) : (
              <Button 
                variant="primary" 
                icon={Compass} 
                onClick={() => navigate('/discover')}
                style={{ width: '100%', marginTop: '12px' }}
              >
                Back to Discover
              </Button>
            )}
          </Card>
        )}
      </main>
    </div>
  );
};

export default QueueStatus;
