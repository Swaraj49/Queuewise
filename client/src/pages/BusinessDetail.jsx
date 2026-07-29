import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { CATEGORIES } from '../config/categories';
import { ArrowLeft, Star, Clock, Users, Zap, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';

const BusinessDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [joining, setJoining] = useState(false);

  // Paginated reviews state
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    fetchBusiness();
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchReviews(page);
    }
  }, [id, page]);

  const fetchBusiness = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/businesses/${id}`);
      setBusiness(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load business details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (currentPage) => {
    try {
      setReviewsLoading(true);
      const res = await axios.get(`/businesses/${id}/reviews`, {
        params: { page: currentPage, limit: 10 }
      });
      setReviews(res.data.reviews || []);
      setTotalReviews(res.data.total || 0);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (joining) return;
    try {
      setJoining(true);
      await axios.post(`/queue/join/${id}`);
      navigate(`/queue-status/${id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to join queue';
      if (msg === 'You are already waiting in this queue') {
        navigate(`/queue-status/${id}`);
      } else {
        alert(msg);
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <nav className="dashboard-nav">
          <h2>Queuewise</h2>
          <div className="nav-profile">
            <span>{user?.name}</span>
            <Button variant="ghost" size="sm" icon={LogOut} onClick={logout}>Logout</Button>
          </div>
        </nav>
        <main className="dashboard-content" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
          <Skeleton height="36px" width="140px" style={{ marginBottom: '20px' }} />
          <Card style={{ padding: 0, overflow: 'hidden', marginBottom: '32px' }}>
            <Skeleton height="360px" width="100%" />
            <div style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height="32px" style={{ marginBottom: '8px' }} />
                  <Skeleton variant="text" width="40%" height="20px" />
                </div>
                <Skeleton height="60px" width="180px" />
              </div>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
                <Skeleton height="90px" style={{ flex: 1, minWidth: '150px' }} />
                <Skeleton height="90px" style={{ flex: 1, minWidth: '150px' }} />
                <Skeleton height="90px" style={{ flex: 1, minWidth: '150px' }} />
              </div>
              <Skeleton height="56px" width="100%" />
            </div>
          </Card>
        </main>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="dashboard-container">
        <nav className="dashboard-nav">
          <h2>Queuewise</h2>
          <div className="nav-profile">
            <span>{user?.name}</span>
            <Button variant="ghost" size="sm" icon={LogOut} onClick={logout}>Logout</Button>
          </div>
        </nav>
        <main className="dashboard-content centered-content" style={{ marginTop: '40px' }}>
          <Card className="text-center" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h2 className="auth-title">Place Not Found</h2>
            <div className="auth-error">{error || 'Business does not exist or was removed.'}</div>
            <Button variant="primary" onClick={() => navigate('/discover')}>Back to Discover</Button>
          </Card>
        </main>
      </div>
    );
  }

  const categoryKey = (business.category || '').toLowerCase();
  const categoryConfig = CATEGORIES[categoryKey] || CATEGORIES.all;
  const images = (business.images && business.images.length > 0) ? business.images : [categoryConfig.banner];
  const activeImage = images[selectedImgIndex] || images[0];

  const estimatedWait = (business.queueLength || 0) * (business.avgServiceTimeMinutes || 10);

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Queuewise</h2>
        <div className="nav-profile">
          <span>{user?.name}</span>
          <Button variant="ghost" size="sm" icon={LogOut} onClick={logout}>Logout</Button>
        </div>
      </nav>

      <main className="dashboard-content" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        {/* Navigation Back Button */}
        <Button 
          variant="outline" 
          size="sm" 
          icon={ArrowLeft} 
          onClick={() => navigate('/discover')}
          style={{ marginBottom: '20px' }}
        >
          Back to Discover
        </Button>

        {/* Top Section: Photo Gallery + Details */}
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: '32px' }}>
          {/* Main Featured Photo Container */}
          <div style={{ height: '360px', width: '100%', position: 'relative', background: '#000' }}>
            <img 
              src={activeImage} 
              alt={business.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(15, 23, 42, 0.95) 100%)' }} />
            
            <Badge 
              status="category" 
              label={`${categoryConfig.icon} ${business.category}`} 
              style={{ 
                position: 'absolute', 
                top: '16px', 
                right: '16px', 
                background: 'rgba(15, 23, 42, 0.85)', 
                color: categoryConfig.accentColor,
                padding: '6px 14px',
                fontSize: '13px'
              }} 
            />
          </div>

          {/* Thumbnail Gallery Bar (if multiple photos) */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px', background: 'rgba(15, 23, 42, 0.8)', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
              {images.map((img, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedImgIndex(idx)}
                  style={{
                    width: '70px',
                    height: '50px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: selectedImgIndex === idx ? `2px solid ${categoryConfig.accentColor}` : '2px solid transparent',
                    opacity: selectedImgIndex === idx ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}

          {/* Main Info Card Content */}
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>{business.name}</h1>
                
                {/* Rating Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px', color: '#fbbf24', fontWeight: '600' }}>
                  <span>★ {business.avgRating > 0 ? business.avgRating : 'New'}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '400' }}>
                    ({business.reviewCount || 0} {business.reviewCount === 1 ? 'customer review' : 'customer reviews'})
                  </span>
                </div>
              </div>
 
              {/* Operating Hours Pill */}
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: '12px', textAlign: 'center', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Operating Hours</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', justifyContent: 'center' }}>
                  <Clock className="w-4 h-4 text-emerald-400" /> {business.openingTime || '09:00'} AM – {business.closingTime || '18:00'} PM
                </span>
              </div>
            </div>

            {/* Queue Summary Box */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '28px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Current Queue</span>
                <div style={{ fontSize: '28px', fontWeight: '700', color: categoryConfig.accentColor, marginTop: '4px' }}>
                  {business.queueLength} waiting
                </div>
              </div>

              <div style={{ height: '40px', width: '1px', background: 'var(--border)' }} className="hide-mobile" />

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Estimated Wait Time</span>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#fbbf24', marginTop: '4px' }}>
                  ~{estimatedWait} mins
                </div>
              </div>

              <div style={{ height: '40px', width: '1px', background: 'var(--border)' }} className="hide-mobile" />

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Avg. Service Rate</span>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b5cf6', marginTop: '4px' }}>
                  {business.avgServiceTimeMinutes || 10} mins / person
                </div>
              </div>
            </div>

            {/* Join Queue Button */}
            <Button
              variant="primary"
              size="lg"
              icon={Zap}
              isLoading={joining}
              onClick={handleJoin}
              disabled={!business.isAcceptingQueue || joining}
              style={{
                width: '100%',
                backgroundColor: business.isAcceptingQueue ? categoryConfig.accentColor : undefined
              }}
            >
              {joining ? 'Joining Queue...' : (business.isAcceptingQueue ? 'Join Queue Now' : 'Queue Closed')}
            </Button>
          </div>
        </Card>

        {/* Customer Reviews Section */}
        <Card style={{ padding: '32px' }}>
          <div className="queue-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '22px', margin: 0 }}>Customer Reviews ({totalReviews})</h2>
            {totalPages > 1 && (
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </span>
            )}
          </div>

          {reviewsLoading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <p className="empty-state">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center" style={{ padding: '40px 20px' }}>
              <Star className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>No Reviews Yet</h3>
              <p className="empty-state">Be the first customer to complete a service and leave a review!</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reviews.map((rev) => (
                  <div 
                    key={rev._id} 
                    style={{ 
                      background: 'rgba(15, 23, 42, 0.5)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '12px', 
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '38px', 
                          height: '38px', 
                          borderRadius: '50%', 
                          background: 'linear-gradient(135px, #3b82f6, #8b5cf6)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '16px',
                          color: 'white'
                        }}>
                          {(rev.userId?.name || 'C')[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{rev.userId?.name || 'Verified Customer'}</h4>
                          <small style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                            {new Date(rev.createdAt).toLocaleDateString()} at {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '6px 12px', borderRadius: '20px', color: '#fbbf24', fontSize: '14px', fontWeight: '700' }}>
                        {'★'.repeat(rev.rating || 5)}{'☆'.repeat(Math.max(0, 5 - (rev.rating || 5)))}
                      </div>
                    </div>

                    {rev.comment ? (
                      <p style={{ color: 'var(--text-primary)', fontSize: '14px', margin: 0, lineHeight: '1.5', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                        &quot;{rev.comment}&quot;
                      </p>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
                        No written comment provided.
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    icon={ChevronLeft} 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    Page {page} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    icon={ChevronRight} 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default BusinessDetail;
