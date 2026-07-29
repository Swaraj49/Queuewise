import React, { useState, useEffect, useContext, createContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import { ListOrdered, BarChart3, MessageSquare, Settings, LogOut, Store } from 'lucide-react';
import Button from '../../components/common/Button';

export const OwnerContext = createContext();

const OwnerLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [queueList, setQueueList] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [qrData, setQrData] = useState(null);
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Form state for registration
  const [name, setName] = useState('');
  const [category, setCategory] = useState('clinic');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [address, setAddress] = useState('');

  // Queue actions state
  const [revenueInputs, setRevenueInputs] = useState({});
  const [callingNext, setCallingNext] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState(null);

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

  useEffect(() => {
    let socket;
    if (business) {
      setQueueLoading(true);
      axios.get(`/queue/list/${business._id}`)
        .then(res => {
          setQueueList(res.data);
        })
        .catch(err => console.error(err))
        .finally(() => setQueueLoading(false));

      fetchAnalytics();
      fetchQrData();
      fetchReviews();

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      socket = io(API_BASE_URL);
      socket.on('connect', () => {
        socket.emit('joinRoom', { businessId: business._id });
      });

      socket.on('queueUpdated', (newList) => {
        setQueueList(newList);
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
      if (!business?._id) return;
      setAnalyticsLoading(true);
      const res = await axios.get(`/businesses/${business._id}/analytics`);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchQrData = async () => {
    try {
      if (!business?._id) return;
      const res = await axios.get(`/businesses/${business._id}/qr-data`);
      setQrData(res.data);
    } catch (err) {
      console.error('Failed to fetch QR data', err);
    }
  };

  const fetchReviews = async () => {
    try {
      if (!business?._id) return;
      setReviewsLoading(true);
      const res = await axios.get(`/businesses/${business._id}/reviews`);
      setReviewsList(res.data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleNext = async () => {
    if (callingNext || !business?._id) return;
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
    if (!business?._id) return;
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
        
        let query = address;
        let geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: { q: query, format: 'json', limit: 1 }
        });

        if (geoRes.data.length === 0 && query.includes(',')) {
          const parts = query.split(',');
          parts.shift();
          query = parts.join(',').trim();
          geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: query, format: 'json', limit: 1 }
          });
        }

        if (geoRes.data.length === 0) {
          setError('Could not find that exact address. Try removing the specific shop/building number and entering Street, City, and State.');
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

  if (loading) return <div className="loading-screen">Loading dashboard...</div>;

  const contextValue = {
    business,
    setBusiness,
    queueList,
    queueLoading,
    analytics,
    analyticsLoading,
    qrData,
    reviewsList,
    reviewsLoading,
    fetchAnalytics,
    fetchReviews,
    fetchMyBusiness,
    callingNext,
    actionLoadingKey,
    revenueInputs,
    setRevenueInputs,
    handleNext,
    handleCurrentAction
  };

  return (
    <OwnerContext.Provider value={contextValue}>
      <div className="dashboard-container owner-dashboard-container">
        <nav className="dashboard-nav">
          <h2>Queuewise Business</h2>
          <div className="nav-profile">
            <span>{user?.name}</span>
            <Button variant="ghost" size="sm" icon={LogOut} onClick={logout}>Logout</Button>
          </div>
        </nav>

        {!business ? (
          <main className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                  <select value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="clinic">Clinic</option>
                    <option value="salon">Salon</option>
                    <option value="repair shop">Repair Shop</option>
                    <option value="restaurant">Restaurant</option>
                  </select>
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="manualLoc" 
                    checked={useManualLocation} 
                    onChange={e => setUseManualLocation(e.target.checked)} 
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="manualLoc" style={{ cursor: 'pointer', margin: 0 }}>Enter Address Manually</label>
                </div>

                {useManualLocation && (
                  <div className="form-group">
                    <label>Street Address, City, State</label>
                    <input 
                      type="text" 
                      value={address} 
                      onChange={e => setAddress(e.target.value)} 
                      placeholder="e.g. 123 Main St, New York, NY"
                      required={useManualLocation}
                    />
                  </div>
                )}

                <button type="submit" className="primary-btn" disabled={creating}>
                  {creating ? 'Creating...' : 'Register & Fetch Location'}
                </button>
              </form>
            </div>
          </main>
        ) : (
          <div className="owner-layout-grid">
            {/* Sidebar Navigation */}
            <aside className="owner-sidebar glass-panel">
              <div className="sidebar-business-info">
                <h3>{business.name}</h3>
                <span className="biz-badge">{business.category}</span>
              </div>

              <div className="sidebar-links">
                <NavLink 
                  to="/owner/dashboard/queue" 
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active-sidebar-link' : ''}`}
                >
                  <ListOrdered className="w-4 h-4 text-blue-400" /> Live Queue
                </NavLink>

                <NavLink 
                  to="/owner/dashboard/analytics" 
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active-sidebar-link' : ''}`}
                >
                  <BarChart3 className="w-4 h-4 text-purple-400" /> Analytics
                </NavLink>

                <NavLink 
                  to="/owner/dashboard/feedback" 
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active-sidebar-link' : ''}`}
                >
                  <MessageSquare className="w-4 h-4 text-amber-400" /> Feedback
                </NavLink>

                <NavLink 
                  to="/owner/dashboard/settings" 
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active-sidebar-link' : ''}`}
                >
                  <Settings className="w-4 h-4 text-slate-400" /> Settings
                </NavLink>
              </div>
            </aside>

            {/* Main Inner Page Content */}
            <main className="owner-main-content">
              <Outlet context={contextValue} />
            </main>
          </div>
        )}
      </div>
    </OwnerContext.Provider>
  );
};

export default OwnerLayout;
