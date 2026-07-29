import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Star, MessageSquare, ChevronLeft, ChevronRight, User } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Skeleton from '../../components/common/Skeleton';

const OwnerFeedback = () => {
  const { business } = useOutletContext();

  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business?._id) {
      fetchPaginatedReviews(page);
    }
  }, [business?._id, page]);

  const fetchPaginatedReviews = async (currentPage) => {
    try {
      setLoading(true);
      const res = await axios.get(`/businesses/${business._id}/reviews`, {
        params: {
          page: currentPage,
          limit: 9 // Using 9 per page to perfectly fit 3-column desktop layout rows
        }
      });
      setReviews(res.data.reviews || []);
      setTotalReviews(res.data.total || 0);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate average rating from current list if available
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="owner-subpage w-full">
      <div className="subpage-header" style={{ marginBottom: '24px' }}>
        <h1>Customer Feedback & Reviews</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View verified customer ratings and written comments left after queue visits.</p>
      </div>

      {/* Summary Header - Wide Card at the top */}
      <Card style={{ width: '100%', marginBottom: '32px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', uppercase: 'true' }}>Average Rating</span>
            </div>
            <div className="stat-value" style={{ color: '#fbbf24', fontSize: '36px', fontWeight: '800' }}>
              ★ {avgRating} <span style={{ fontSize: '18px', color: 'var(--text-secondary)', fontWeight: '400' }}>/ 5.0</span>
            </div>
          </div>

          <div style={{ height: '40px', width: '1px', background: 'var(--border)' }} className="hide-mobile" />

          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', uppercase: 'true' }}>Total Submissions</span>
            </div>
            <div className="stat-value" style={{ color: '#8b5cf6', fontSize: '36px', fontWeight: '800' }}>
              {totalReviews} <span style={{ fontSize: '18px', color: 'var(--text-secondary)', fontWeight: '400' }}>reviews</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Title & Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>All Submissions ({totalReviews})</h2>
        {totalPages > 1 && (
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 w-full">
          {[1, 2, 3].map(n => (
            <Card key={n} style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(30, 41, 59, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '80%' }}>
                  <Skeleton variant="circle" width="38px" height="38px" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton variant="text" width="70%" height="15px" style={{ marginBottom: '4px' }} />
                    <Skeleton variant="text" width="40%" height="11px" />
                  </div>
                </div>
                <Skeleton width="40px" height="22px" style={{ borderRadius: '16px' }} />
              </div>
              <Skeleton height="50px" width="100%" />
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card className="text-center" style={{ padding: '48px 20px', width: '100%' }}>
          <Star className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No Customer Reviews Yet</h3>
          <p className="empty-state">When customers complete their queue visit, their ratings and comments will appear here.</p>
        </Card>
      ) : (
        <div style={{ width: '100%' }}>
          {/* Reviews displayed as a responsive grid of cards (2-3 per row on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 w-full">
            {reviews.map((rev) => (
              <Card 
                key={rev._id} 
                style={{ 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  textAlign: 'center',
                  height: '100%',
                  background: 'rgba(30, 41, 59, 0.4)'
                }}
              >
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135px, #3b82f6, #8b5cf6)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '15px',
                        color: 'white',
                        flexShrink: 0
                      }}>
                        {(rev.userId?.name || 'C')[0].toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', textAlign: 'center' }}>{rev.userId?.name || 'Anonymous Customer'}</h4>
                        <small style={{ color: 'var(--text-secondary)', fontSize: '11px', textAlign: 'center', marginTop: '2px' }}>
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)', padding: '4px 10px', borderRadius: '16px', color: '#fbbf24', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      ★ {rev.rating || 5}
                    </div>
                  </div>

                  {rev.comment ? (
                    <p style={{ color: 'var(--text-primary)', fontSize: '14px', margin: 0, lineHeight: '1.6', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', borderTop: '3px solid #8b5cf6', fontStyle: 'italic', textAlign: 'center', width: '100%' }}>
                      &quot;{rev.comment}&quot;
                    </p>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, fontStyle: 'italic', textAlign: 'center' }}>
                      No written comment provided.
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', width: '100%' }}>
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
    </div>
  );
};

export default OwnerFeedback;
