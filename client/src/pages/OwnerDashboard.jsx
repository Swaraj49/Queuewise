import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';

const OwnerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [queueList, setQueueList] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [qrData, setQrData] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('clinic');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyBusiness();
  }, []);

  const fetchMyBusiness = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/businesses/me');
      setBusiness(res.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Failed to fetch business', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const [reviewsList, setReviewsList] = useState([]);

  useEffect(() => {
    let socket;
    if (business) {
      // 1. Fetch initial queue list, analytics, QR data, and reviews
      axios.get(`/queue/list/${business._id}`).then(res => setQueueList(res.data));
      fetchAnalytics();
      fetchQrData();
      fetchReviews();

      // 2. Setup socket
      socket = io('http://localhost:5000');
      socket.on('connect', () => {
        socket.emit('joinRoom', { businessId: business._id });
      });

      socket.on('queueUpdated', (newList) => {
        setQueueList(newList);
        // Refresh business to get updated avg wait time if it changed
        fetchMyBusiness();
        fetchAnalytics();
        fetchReviews();
      });
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [business?._id]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`/businesses/${business._id}/analytics`);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    }
  };

  const fetchQrData = async () => {
    try {
      const res = await axios.get(`/businesses/${business._id}/qr-data`);
      setQrData(res.data);
    } catch (err) {
      console.error('Failed to fetch QR data', err);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`/businesses/${business._id}/reviews`);
      setReviewsList(res.data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    }
  };

  const [useManualLocation, setUseManualLocation] = useState(false);
  const [address, setAddress] = useState('');
  
  // Settings state
  const [editingTime, setEditingTime] = useState(false);
  const [newAvgTime, setNewAvgTime] = useState('');

  const handleUpdateAvgTime = async () => {
    if (!newAvgTime) {
      setEditingTime(false);
      return;
    }
    try {
      const res = await axios.patch(`/queue/settings/${business._id}`, { avgServiceTimeMinutes: newAvgTime });
      setBusiness(res.data);
      setEditingTime(false);
      setNewAvgTime('');
    } catch(err) {
      alert(err.response?.data?.message || 'Failed to update time');
    }
  };

  const handleRegisterBusiness = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      let lat, lng;

      if (useManualLocation) {
        if (!address) {
          setError('Please enter an address');
          setCreating(false);
          return;
        }
        
        // Use free OpenStreetMap Nominatim API for geocoding
        let query = address;
        let geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: { q: query, format: 'json', limit: 1 }
        });

        // Fallback: If Nominatim fails (often struggles with specific shop numbers), 
        // try stripping the first part of the address before the comma and search again.
        if (geoRes.data.length === 0 && query.includes(',')) {
          const parts = query.split(',');
          parts.shift(); // Remove the first part (e.g., "Shop no - 15")
          query = parts.join(',').trim();
          
          geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: query, format: 'json', limit: 1 }
          });
        }

        if (geoRes.data.length === 0) {
          setError('Could not find that exact address. Try removing the specific shop/building number and just entering the Street, City, and State.');
          setCreating(false);
          return;
        }

        lat = geoRes.data[0].lat;
        lng = geoRes.data[0].lon;
        
        await createBusiness(lng, lat);
      } else {
        if (!navigator.geolocation) {
          setError('Geolocation is not supported by your browser.');
          setCreating(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => createBusiness(pos.coords.longitude, pos.coords.latitude),
          (err) => {
            setError('Location access denied. Please allow location or use Manual Address entry.');
            setCreating(false);
          }
        );
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during registration.');
      setCreating(false);
    }
  };

  const createBusiness = async (lng, lat) => {
    try {
      const res = await axios.post('/businesses', {
        name,
        category,
        lng,
        lat,
        avgServiceTimeMinutes: 10
      });
      setBusiness(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create business');
    } finally {
      setCreating(false);
    }
  };

  const [revenueInputs, setRevenueInputs] = useState({});
  const [callingNext, setCallingNext] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState(null);

  const handleNext = async () => {
    if (callingNext) return;
    try {
      setCallingNext(true);
      await axios.patch(`/queue/next/${business._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to call next user');
    } finally {
      setCallingNext(false);
    }
  };

  const handleCurrentAction = async (action, entryId = null) => {
    const key = `${action}_${entryId || 'current'}`;
    if (actionLoadingKey === key) return;
    try {
      setActionLoadingKey(key);
      const payload = { action };
      if (action === 'completed' && entryId && revenueInputs[entryId]) {
        payload.revenue = revenueInputs[entryId];
      }
      await axios.patch(`/queue/current/${business._id}`, payload);
      if (action === 'completed' && entryId) {
        setRevenueInputs(prev => {
          const next = { ...prev };
          delete next[entryId];
          return next;
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to mark user as ${action}`);
    } finally {
      setActionLoadingKey(null);
    }
  };

  if (loading) return <div className="loading-screen">Loading dashboard...</div>;

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Queuewise Business</h2>
        <div className="nav-profile">
          <span>{user?.name}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </nav>
      
      <main className="dashboard-content">
        {!business ? (
          <div className="glass-panel" style={{ margin: '0 auto', maxWidth: '500px' }}>
            <h2 className="auth-title">Register Your Business</h2>
            <p className="auth-subtitle">Set up your profile to start accepting queues.</p>
            
            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleRegisterBusiness} className="auth-form">
              <div className="form-group">
                <label>Business Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  placeholder="e.g. Dr. Smith's Clinic"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select 
                  className="category-filter" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  <option value="clinic">Clinic</option>
                  <option value="salon">Salon</option>
                  <option value="repair shop">Repair Shop</option>
                  <option value="restaurant">Restaurant</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={useManualLocation}
                    onChange={(e) => setUseManualLocation(e.target.checked)}
                  />
                  Enter address manually instead of using GPS
                </label>
              </div>

              {useManualLocation && (
                <div className="form-group">
                  <label>Business Address</label>
                  <input 
                    type="text" 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    required={useManualLocation}
                    placeholder="e.g. 123 Main St, New York, NY"
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                    We will convert this address into GPS coordinates automatically.
                  </small>
                </div>
              )}

              <button type="submit" className="primary-btn" disabled={creating} style={{ marginTop: '16px' }}>
                {creating ? 'Registering...' : (useManualLocation ? 'Register Business' : 'Register Business (Uses GPS)')}
              </button>
            </form>
          </div>
        ) : (
          <div className="dashboard-grid">
            {/* Stats Panel */}
            <div className="biz-dashboard-header">
              <h1>{business.name}</h1>
              <div className="stats-row">
                <div className="stat-card">
                  <h3>Total Waiting</h3>
                  <div className="stat-value">{queueList.filter(q => q.status === 'waiting').length}</div>
                </div>
                <div className="stat-card">
                  <h3>Avg Service Time</h3>
                  {editingTime ? (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
                      <input 
                        type="number" 
                        min="1"
                        value={newAvgTime}
                        onChange={(e) => setNewAvgTime(e.target.value)}
                        placeholder={business.avgServiceTimeMinutes}
                        style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', color: 'white', textAlign: 'center' }}
                      />
                      <button onClick={handleUpdateAvgTime} className="primary-btn" style={{ padding: '4px 12px', fontSize: '12px', marginTop: '0' }}>Save</button>
                    </div>
                  ) : (
                    <div 
                      className="stat-value" 
                      onClick={() => setEditingTime(true)}
                      style={{ cursor: 'pointer' }}
                      title="Click to manually override"
                    >
                      {business.avgServiceTimeMinutes} mins <span style={{ fontSize: '12px', opacity: 0.5 }}>✎</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Counter QR Code Panel */}
            {qrData && (
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Counter QR Code</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                    Display or print this QR code at your counter. Customers can scan it with their phone to instantly join your queue!
                  </p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button 
                      className="primary-btn" 
                      onClick={() => window.print()}
                      style={{ padding: '10px 18px', fontSize: '14px', margin: 0 }}
                    >
                      🖨️ Print QR Code
                    </button>
                    <small style={{ color: 'var(--text-secondary)', fontSize: '12px', wordBreak: 'break-all' }}>
                      URL: {qrData.joinUrl}
                    </small>
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  <QRCodeSVG value={qrData.joinUrl} size={150} />
                  <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: '700', marginTop: '8px' }}>Scan to Join Queue</span>
                </div>
              </div>
            )}

            {/* Active Service Panel */}
            <div className="active-service-panel glass-panel">
              <h2>Awaiting Arrival</h2>
              {queueList.filter(q => q.status === 'called').map(q => (
                <div key={q._id} className="in-service-card" style={{ borderLeft: '4px solid #fbbf24', marginBottom: '12px' }}>
                  <div className="customer-info">
                    <span className="customer-name">{q.userId.name} (Called)</span>
                    <span className="customer-email">Waiting to arrive at counter...</span>
                  </div>
                  <div className="action-buttons">
                    <button 
                      className="primary-btn" 
                      onClick={() => handleCurrentAction('arrived')}
                      style={{ backgroundColor: '#fbbf24', color: '#000' }}
                    >
                      Arrived
                    </button>
                    <button 
                      className="cancel-btn" 
                      onClick={() => handleCurrentAction('no-show')}
                      style={{ padding: '14px', borderRadius: '8px' }}
                    >
                      No Show
                    </button>
                  </div>
                </div>
              ))}
              {queueList.filter(q => q.status === 'called').length === 0 && (
                <p className="empty-state" style={{ marginBottom: '24px' }}>No users currently called.</p>
              )}

              <h2>Currently In-Service</h2>
              {queueList.filter(q => q.status === 'in-service').map(q => (
                <div key={q._id} className="in-service-card">
                  <div className="customer-info">
                    <span className="customer-name">{q.userId.name}</span>
                    <span className="customer-email">{q.userId.email}</span>
                  </div>
                  <div className="action-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }}>$</span>
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={revenueInputs[q._id] || ''}
                        onChange={(e) => setRevenueInputs(prev => ({ ...prev, [q._id]: e.target.value }))}
                        style={{ padding: '10px 10px 10px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white', width: '90px' }}
                        title="Amount collected"
                      />
                    </div>
                    <button 
                      className="primary-btn" 
                      onClick={() => handleCurrentAction('completed', q._id)}
                      style={{ padding: '12px 16px', margin: 0 }}
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))}
              
              {queueList.filter(q => q.status === 'in-service').length === 0 && (
                <p className="empty-state">No one is currently being served.</p>
              )}
            </div>

            {/* Queue List Panel */}
            <div className="queue-list-panel glass-panel">
              <div className="queue-header">
                <h2>Waiting Queue</h2>
                <button 
                  className="primary-btn call-next-btn" 
                  onClick={handleNext}
                  disabled={callingNext || queueList.filter(q => q.status === 'waiting').length === 0}
                  style={{ opacity: callingNext ? 0.7 : 1 }}
                >
                  {callingNext ? 'Calling...' : 'Call Next User'}
                </button>
              </div>
              
              <div className="queue-items">
                {queueList.filter(q => q.status === 'waiting').map((q) => (
                  <div key={q._id} className="queue-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="position-badge" style={{ backgroundColor: q.priority === 'priority' ? '#fbbf24' : '' }}>
                        #{q.position}
                      </div>
                      <div className="customer-info">
                        <span className="customer-name">
                          {q.userId.name} {q.priority === 'priority' && <span style={{ color: '#fbbf24', fontSize: '14px' }}>★</span>}
                        </span>
                        <span className="wait-time">Est. wait: {q.position * business.avgServiceTimeMinutes} mins</span>
                      </div>
                    </div>
                    {q.priority !== 'priority' && (
                      <button 
                        className="cancel-btn" 
                        title="Mark as Priority"
                        style={{ padding: '8px', fontSize: '12px' }}
                        onClick={async () => {
                          try {
                            await axios.patch(`/queue/priority/${q._id}`);
                          } catch (err) {
                            alert(err.response?.data?.message || 'Failed to prioritize');
                          }
                        }}
                      >
                        ★ Elevate
                      </button>
                    )}
                  </div>
                ))}

                {queueList.filter(q => q.status === 'waiting').length === 0 && (
                  <p className="empty-state">Queue is currently empty.</p>
                )}
              </div>
            </div>
            
            {/* Analytics Panel */}
            {analytics && (
              <div className="analytics-panel glass-panel" style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
                <div className="queue-header" style={{ marginBottom: '24px' }}>
                  <h2>Business Insights</h2>
                </div>

                <div className="stats-row" style={{ marginBottom: '32px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="stat-card" style={{ flex: 1, minWidth: '200px' }}>
                    <h3>No-Show Rate</h3>
                    <div className="stat-value" style={{ color: analytics.noShowRate > 20 ? '#ef4444' : '#10b981' }}>
                      {analytics.noShowRate}%
                    </div>
                  </div>
                  <div className="stat-card" style={{ flex: 1, minWidth: '200px' }}>
                    <h3>Served This Week</h3>
                    <div className="stat-value" style={{ color: '#8b5cf6' }}>
                      {analytics.servedThisWeek}
                    </div>
                  </div>
                  <div className="stat-card" style={{ flex: 1, minWidth: '200px' }}>
                    <h3>Revenue This Week</h3>
                    <div className="stat-value" style={{ color: '#fbbf24' }}>
                      ${analytics.totalRevenueThisWeek.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  {/* Revenue Chart */}
                  <div className="chart-container" style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--text-secondary)' }}>Revenue by Hour</h3>
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer>
                        <BarChart data={analytics.hourlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" tickFormatter={(h) => `${h}:00`} />
                          <YAxis stroke="rgba(255,255,255,0.5)" tickFormatter={(val) => `$${val}`} />
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(val) => `$${val.toFixed(2)}`} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Bar dataKey="revenue" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Wait Time Chart */}
                  <div className="chart-container" style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--text-secondary)' }}>Avg Wait Time (Mins)</h3>
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer>
                        <BarChart data={analytics.hourlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" tickFormatter={(h) => `${h}:00`} />
                          <YAxis stroke="rgba(255,255,255,0.5)" />
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Bar dataKey="avgWaitTimeMinutes" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Traffic Chart */}
                  <div className="chart-container" style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--text-secondary)' }}>Traffic Volume (Peak Hours)</h3>
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer>
                        <LineChart data={analytics.hourlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" tickFormatter={(h) => `${h}:00`} />
                          <YAxis stroke="rgba(255,255,255,0.5)" />
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                          <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Reviews & Feedback Panel */}
            <div className="glass-panel" style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
              <div className="queue-header" style={{ marginBottom: '20px' }}>
                <h2>Customer Reviews & Feedback ({reviewsList.length})</h2>
              </div>

              {reviewsList.length === 0 ? (
                <p className="empty-state">No customer reviews received yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {reviewsList.map((rev) => (
                    <div 
                      key={rev._id} 
                      style={{ 
                        background: 'rgba(15, 23, 42, 0.5)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '12px', 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: '600', fontSize: '15px' }}>{rev.userId?.name || 'Customer'}</span>
                          <span style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '700' }}>
                            {'★'.repeat(rev.rating || 5)}{'☆'.repeat(Math.max(0, 5 - (rev.rating || 5)))}
                          </span>
                        </div>
                        {rev.comment && (
                          <p style={{ color: 'var(--text-primary)', fontSize: '14px', margin: '8px 0', fontStyle: 'italic' }}>
                            &quot;{rev.comment}&quot;
                          </p>
                        )}
                      </div>
                      <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>
                        {new Date(rev.createdAt).toLocaleDateString()} at {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OwnerDashboard;
