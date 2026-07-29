import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CATEGORIES } from '../config/categories';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Star, MapPin, Clock, Users, LayoutGrid, Map as MapIcon, LogOut, Zap } from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';

// Fix icon markers using reliable CDN URLs to avoid bundler asset path issues
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const Discover = () => {
  const { category: categoryParam } = useParams();
  const activeCategoryKey = categoryParam && CATEGORIES[categoryParam] ? categoryParam : 'all';
  const currentCategoryConfig = CATEGORIES[activeCategoryKey];

  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [sortBy, setSortBy] = useState('distance'); // 'distance' or 'rating'
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [joiningId, setJoiningId] = useState(null);
  const [fetchError, setFetchError] = useState('');

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Get geolocation on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          setLocError('Location access denied. We need your location to find nearby businesses.');
          setLoading(false);
        }
      );
    } else {
      setLocError('Geolocation is not supported by your browser.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location) {
      fetchBusinesses();
    }
  }, [location, activeCategoryKey, sortBy]);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setFetchError('');
      const dbCat = currentCategoryConfig.dbCategory;
      const res = await axios.get('/businesses/nearby', {
        params: {
          lat: location.lat,
          lng: location.lng,
          category: dbCat || undefined,
          sortBy: sortBy || 'distance',
          maxDistance: 50000000 // 50,000 km radius (global) so test data always shows up
        }
      });
      setBusinesses(res.data);
    } catch (err) {
      console.error(err);
      setFetchError('Unable to load nearby places. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (businessId) => {
    if (joiningId) return; // Prevent double clicks
    try {
      setJoiningId(businessId);
      await axios.post(`/queue/join/${businessId}`);
      navigate(`/queue-status/${businessId}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to join queue';
      if (msg === 'You are already waiting in this queue') {
        navigate(`/queue-status/${businessId}`);
      } else {
        alert(msg);
      }
    } finally {
      setJoiningId(null);
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

      {/* Persistent Category Navigation Tabs */}
      <div className="category-nav-bar">
        <div className="category-nav-container">
          {Object.values(CATEGORIES).map(cat => (
            <NavLink 
              key={cat.key} 
              to={`/discover/${cat.key}`}
              className={({ isActive }) => `category-nav-tab ${isActive ? 'active-category-tab' : ''}`}
              style={({ isActive }) => ({
                borderColor: isActive ? cat.accentColor : 'transparent',
                color: isActive ? '#f8fafc' : 'var(--text-secondary)'
              })}
            >
              <span className="tab-icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
      
      <main className="dashboard-content">
        {/* Dynamic Category Hero Banner */}
        <div 
          className="discover-hero-banner"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%), url(${currentCategoryConfig.banner})`,
            boxShadow: `0 20px 40px -15px ${currentCategoryConfig.accentColor}30`
          }}
        >
          <div className="hero-content">
            <div className="hero-badge" style={{ background: `${currentCategoryConfig.accentColor}25`, color: currentCategoryConfig.accentColor, border: `1px solid ${currentCategoryConfig.accentColor}60` }}>
              <span>{currentCategoryConfig.icon}</span> {currentCategoryConfig.label}
            </div>
            <h1>{currentCategoryConfig.label} Near You</h1>
            <p>{currentCategoryConfig.subtitle}</p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="discover-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px', gap: '4px', height: '42px' }}>
            <button 
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0 16px',
                height: '34px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: viewMode === 'list' ? `1px solid ${currentCategoryConfig.accentColor}60` : '1px solid transparent',
                backgroundColor: viewMode === 'list' ? currentCategoryConfig.accentColor : 'transparent',
                color: viewMode === 'list' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>List View</span>
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('map')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0 16px',
                height: '34px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: viewMode === 'map' ? `1px solid ${currentCategoryConfig.accentColor}60` : '1px solid transparent',
                backgroundColor: viewMode === 'map' ? currentCategoryConfig.accentColor : 'transparent',
                color: viewMode === 'map' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <MapIcon className="w-4 h-4" />
              <span>Map View</span>
            </button>
          </div>

          <select 
            className="category-filter" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{ 
              height: '42px', 
              borderRadius: '10px', 
              padding: '0 16px', 
              fontSize: '14px', 
              fontWeight: '500', 
              background: 'rgba(15, 23, 42, 0.7)', 
              border: '1px solid var(--border)', 
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
              margin: 0
            }}
          >
            <option value="distance">Sort: Nearest Distance</option>
            <option value="rating">Sort: Highest Rating</option>
          </select>
        </div>

        {fetchError && (
          <div className="auth-error" style={{ marginBottom: '20px' }}>
            {fetchError}
          </div>
        )}

        {locError ? (
          <div className="auth-error location-error">
            {locError}
          </div>
        ) : loading ? (
          <div className="business-grid">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <Card key={n} style={{ padding: 0, overflow: 'hidden' }}>
                <Skeleton height="180px" width="100%" />
                <div style={{ padding: '20px' }}>
                  <Skeleton variant="text" width="70%" height="24px" className="mb-2" />
                  <Skeleton variant="text" width="40%" height="16px" className="mb-4" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <Skeleton variant="text" width="90%" height="14px" />
                    <Skeleton variant="text" width="80%" height="14px" />
                    <Skeleton variant="text" width="85%" height="14px" />
                  </div>
                  <Skeleton height="44px" width="100%" />
                </div>
              </Card>
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <Card className="text-center" style={{ padding: '48px 24px', maxWidth: '500px', margin: '40px auto' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{currentCategoryConfig.icon}</div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>No {currentCategoryConfig.label} Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              We couldn't find any {currentCategoryConfig.label.toLowerCase()} near your location right now.
            </p>
          </Card>
        ) : viewMode === 'map' ? (
          <Card style={{ height: '550px', padding: '12px', width: '100%', overflow: 'hidden' }}>
            <MapContainer 
              center={[location.lat, location.lng]} 
              zoom={13} 
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%', borderRadius: '12px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User Location Marker */}
              <Marker position={[location.lat, location.lng]} icon={userIcon}>
                <Popup>
                  <div style={{ color: '#1e293b', fontWeight: '600' }}>
                    📍 Your Location
                  </div>
                </Popup>
              </Marker>

              {/* Business Markers */}
              {businesses.map((biz) => {
                const lat = biz.location?.coordinates[1];
                const lng = biz.location?.coordinates[0];
                if (lat === undefined || lng === undefined) return null;

                return (
                  <Marker key={biz._id} position={[lat, lng]} icon={defaultIcon}>
                    <Popup>
                      <div style={{ color: '#1e293b', minWidth: '180px' }}>
                        <h4 
                          onClick={() => navigate(`/business/${biz._id}`)}
                          style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}
                        >
                          {biz.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '12px', color: '#d97706', fontWeight: '600' }}>
                          <span>★ {biz.avgRating > 0 ? biz.avgRating : 'New'}</span>
                          <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>({biz.reviewCount || 0} reviews)</span>
                        </div>
                        <Badge status="category" label={biz.category} style={{ marginBottom: '8px' }} />
                        <p style={{ margin: '4px 0', fontSize: '13px', color: '#475569' }}>
                          <strong>Distance:</strong> {(biz.calculatedDistance / 1000).toFixed(1)} km
                        </p>
                        <p style={{ margin: '4px 0 12px 0', fontSize: '13px', color: '#475569' }}>
                          <strong>Queue:</strong> {biz.queueLength} waiting
                        </p>
                        <button 
                          onClick={() => handleJoin(biz._id)}
                          disabled={!biz.isAcceptingQueue || joiningId === biz._id}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: biz.isAcceptingQueue ? currentCategoryConfig.accentColor : '#94a3b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: (biz.isAcceptingQueue && joiningId !== biz._id) ? 'pointer' : 'not-allowed',
                            fontSize: '13px',
                            opacity: joiningId === biz._id ? 0.7 : 1
                          }}
                        >
                          {joiningId === biz._id ? 'Joining...' : (biz.isAcceptingQueue ? 'Join Queue' : 'Queue Closed')}
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </Card>
        ) : (
          <div className="business-grid">
            {businesses.map((biz) => {
              const cardImage = (biz.images && biz.images.length > 0) ? biz.images[0] : currentCategoryConfig.banner;

              return (
                <Card 
                  key={biz._id} 
                  hover
                  onClick={() => navigate(`/business/${biz._id}`)}
                  style={{ padding: 0, overflow: 'hidden', borderTop: `3px solid ${currentCategoryConfig.accentColor}` }}
                >
                  <div style={{ height: '180px', width: '100%', overflow: 'hidden', position: 'relative' }}>
                    <img 
                      src={cardImage} 
                      alt={biz.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(15, 23, 42, 0.95) 100%)' }} />
                    <Badge 
                      status="category" 
                      label={biz.category} 
                      style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(15, 23, 42, 0.85)', color: currentCategoryConfig.accentColor }} 
                    />
                  </div>

                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div className="biz-header" style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', textAlign: 'center' }}>{biz.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px', fontSize: '14px', color: '#fbbf24', fontWeight: '600' }}>
                          <span>★ {biz.avgRating > 0 ? biz.avgRating : 'New'}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '400' }}>({biz.reviewCount || 0} {biz.reviewCount === 1 ? 'review' : 'reviews'})</span>
                        </div>
                      </div>
                    </div>
                    <div className="biz-stats" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', width: '100%' }}>
                      <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span>Distance: {(biz.calculatedDistance / 1000).toFixed(1)} km</span>
                      </p>
                      <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Queue Length: {biz.queueLength} waiting</span>
                      </p>
                      <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Avg. Wait: {biz.queueLength * biz.avgServiceTimeMinutes} mins</span>
                      </p>
                    </div>

                    <Button 
                      variant="primary" 
                      icon={Zap} 
                      isLoading={joiningId === biz._id}
                      disabled={!biz.isAcceptingQueue || joiningId === biz._id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoin(biz._id);
                      }}
                      style={{ 
                        marginTop: '16px',
                        width: '100%',
                        backgroundColor: biz.isAcceptingQueue ? currentCategoryConfig.accentColor : undefined
                      }}
                    >
                      {joiningId === biz._id ? 'Joining...' : (biz.isAcceptingQueue ? 'Join Queue' : 'Queue Closed')}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Discover;
