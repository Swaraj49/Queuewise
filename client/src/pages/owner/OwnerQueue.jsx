import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { PhoneCall, CheckCircle2, UserX, Clock, ArrowUp, Printer, QrCode, UserCheck, Users, Play, Ban } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Skeleton from '../../components/common/Skeleton';

const OwnerQueue = () => {
  const {
    business,
    queueList,
    queueLoading,
    qrData,
    callingNext,
    actionLoadingKey,
    revenueInputs,
    setRevenueInputs,
    handleNext,
    handleCurrentAction
  } = useOutletContext();

  const handlePrintQr = () => {
    window.print();
  };

  if (queueLoading) {
    return (
      <div className="owner-subpage w-full">
        <div className="subpage-header" style={{ marginBottom: '24px' }}>
          <h1>Live Queue Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage live customer arrivals, service status, and queue priority.</p>
        </div>

        {/* 4 Stat Cards Skeletons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px', width: '100%' }}>
          {[1, 2, 3, 4].map(n => (
            <Card key={n} style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 16px', margin: 0 }}>
              <Skeleton variant="circle" width="32px" height="32px" style={{ marginBottom: '12px' }} />
              <Skeleton variant="text" width="60%" height="12px" style={{ marginBottom: '8px' }} />
              <Skeleton variant="text" width="40%" height="32px" />
            </Card>
          ))}
        </div>

        {/* Wide card loading placeholder */}
        <Card style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <Skeleton variant="text" width="160px" height="24px" className="mb-2" />
              <Skeleton variant="text" width="240px" height="14px" />
            </div>
            <Skeleton height="44px" width="140px" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Left Col Skeletons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <Skeleton variant="text" width="120px" height="20px" className="mb-4" />
                <Card style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', marginBottom: '12px' }}>
                  <Skeleton variant="text" width="50%" height="18px" className="mb-2" />
                  <Skeleton variant="text" width="70%" height="12px" />
                </Card>
              </div>
              <hr style={{ borderColor: 'var(--border)' }} />
              <div>
                <Skeleton variant="text" width="150px" height="20px" className="mb-4" />
                <Card style={{ background: 'rgba(255,255,255,0.02)', padding: '16px' }}>
                  <Skeleton variant="text" width="40%" height="18px" className="mb-2" />
                  <Skeleton variant="text" width="60%" height="12px" />
                </Card>
              </div>
            </div>

            {/* Right Col Skeletons */}
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
              <Skeleton variant="text" width="100px" height="20px" className="mb-4" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3].map(n => (
                  <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '80%' }}>
                      <Skeleton width="32px" height="32px" style={{ borderRadius: '8px' }} />
                      <div style={{ flex: 1 }}>
                        <Skeleton variant="text" width="60%" height="16px" className="mb-1" />
                        <Skeleton variant="text" width="45%" height="12px" />
                      </div>
                    </div>
                    <Skeleton width="70px" height="32px" style={{ borderRadius: '8px' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const totalWaiting = queueList.filter(q => q.status === 'waiting').length;
  const currentlyServing = queueList.filter(q => q.status === 'in-service').length;
  const avgWaitTime = totalWaiting * (business?.avgServiceTimeMinutes || 10);
  const totalNoShows = queueList.filter(q => q.status === 'no-show').length;

  return (
    <div className="owner-subpage">
      <div className="subpage-header" style={{ marginBottom: '24px' }}>
        <h1>Live Queue Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage live customer arrivals, service status, and queue priority.</p>
      </div>

      {/* Top row: 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px', width: '100%' }}>
        <Card style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 16px', margin: 0 }}>
          <Users className="w-8 h-8 text-blue-400" style={{ marginBottom: '12px' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Total Waiting</span>
          <span style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginTop: '8px', lineHeight: 1 }}>{totalWaiting}</span>
        </Card>

        <Card style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 16px', margin: 0 }}>
          <Play className="w-8 h-8 text-emerald-400" style={{ marginBottom: '12px' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Currently Serving</span>
          <span style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginTop: '8px', lineHeight: 1 }}>{currentlyServing}</span>
        </Card>

        <Card style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 16px', margin: 0 }}>
          <Clock className="w-8 h-8 text-amber-400" style={{ marginBottom: '12px' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Est. Wait Time</span>
          <span style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginTop: '8px', lineHeight: 1 }}>{avgWaitTime} mins</span>
        </Card>

        <Card style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 16px', margin: 0 }}>
          <Ban className="w-8 h-8 text-rose-400" style={{ marginBottom: '12px' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>No-Shows Today</span>
          <span style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginTop: '8px', lineHeight: 1 }}>{totalNoShows}</span>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        {/* Printable Counter QR Code Card */}
        {qrData && (
          <Card className="qr-counter-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px', width: '100%', padding: '28px' }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <QrCode className="w-6 h-6 text-blue-400" />
                <h2 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Counter QR Code</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                Display this code at your reception or entrance so customers can scan & join instantly from their mobile devices.
              </p>
              <Button 
                variant="primary" 
                size="md" 
                icon={Printer} 
                onClick={handlePrintQr}
              >
                Print Counter Banner
              </Button>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', flexShrink: 0, margin: '8px 0' }}>
              <QRCodeSVG value={qrData.joinUrl} size={150} style={{ display: 'block' }} />
              <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: '700', marginTop: '10px', textAlign: 'center', width: '100%' }}>Scan to Join Queue</span>
            </div>
          </Card>
        )}

        {/* Main Live Queue Management card - taking full width */}
        <Card style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Live Queue Activity</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>Call next waiting customer and manage current counters.</p>
            </div>
            <Button 
              variant="primary" 
              icon={PhoneCall} 
              isLoading={callingNext} 
              onClick={handleNext}
              disabled={callingNext || totalWaiting === 0}
              style={{ fontSize: '15px', padding: '12px 24px' }}
            >
              Call Next User
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Left: Active Service Section (Awaiting Arrival & In-Service) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', margin: 0, fontWeight: '600' }}>Awaiting Arrival</h3>
                  <Badge status="waiting" label="Called" />
                </div>

                {queueList.filter(q => q.status === 'called').map(q => (
                  <div key={q._id} className="in-service-card" style={{ borderTop: '4px solid #f59e0b', marginBottom: '12px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px' }}>
                    <div className="customer-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span className="customer-name" style={{ fontWeight: '600', fontSize: '18px' }}>{q.userId.name}</span>
                      <span className="customer-email" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Waiting to arrive at counter...</span>
                    </div>
                    <div className="action-buttons" style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center', width: '100%' }}>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        icon={UserCheck} 
                        isLoading={actionLoadingKey === 'arrived_current'} 
                        onClick={() => handleCurrentAction('arrived')}
                      >
                        Arrived
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        icon={UserX} 
                        isLoading={actionLoadingKey === 'no-show_current'} 
                        onClick={() => handleCurrentAction('no-show')}
                      >
                        No Show
                      </Button>
                    </div>
                  </div>
                ))}
                {queueList.filter(q => q.status === 'called').length === 0 && (
                  <p className="empty-state text-center" style={{ textAlign: 'center' }}>No users currently called.</p>
                )}
              </div>

              <hr style={{ borderColor: 'var(--border)' }} />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', margin: 0, fontWeight: '600' }}>Currently In-Service</h3>
                  <Badge status="in-service" label="In-Service" />
                </div>

                {queueList.filter(q => q.status === 'in-service').map(q => (
                  <div key={q._id} className="in-service-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRadius: '12px' }}>
                    <div className="customer-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span className="customer-name" style={{ fontWeight: '600', fontSize: '18px' }}>{q.userId.name}</span>
                      <span className="customer-email" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{q.userId.email}</span>
                    </div>
                    <div className="action-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                      <div style={{ position: 'relative', flex: '1 1 100px', maxWidth: '140px' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>$</span>
                        <input 
                          type="number"
                          placeholder="Revenue"
                          value={revenueInputs[q._id] || ''}
                          onChange={(e) => setRevenueInputs(prev => ({ ...prev, [q._id]: e.target.value }))}
                          style={{ padding: '8px 8px 8px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white', width: '100%', fontSize: '13px', textAlign: 'center' }}
                        />
                      </div>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        icon={CheckCircle2} 
                        isLoading={actionLoadingKey === `completed_${q._id}`} 
                        onClick={() => handleCurrentAction('completed', q._id)}
                      >
                        Complete
                      </Button>
                    </div>
                  </div>
                ))}
                
                {queueList.filter(q => q.status === 'in-service').length === 0 && (
                  <p className="empty-state text-center" style={{ textAlign: 'center' }}>No one is currently being served.</p>
                )}
              </div>
            </div>

            {/* Right: Waiting Queue Section */}
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '24px' }} className="owner-queue-right-col">
              <h3 style={{ fontSize: '16px', marginBottom: '16px', fontWeight: '600', textAlign: 'center' }}>Waiting List</h3>
              
              <div className="queue-items" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {queueList.filter(q => q.status === 'waiting').map((q) => (
                  <div key={q._id} className="queue-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div className="position-badge" style={{ backgroundColor: q.priority === 'priority' ? '#a855f7' : '', color: 'white', fontWeight: '700', padding: '6px 12px', borderRadius: '8px', fontSize: '14px', width: 'auto', height: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        #{q.position}
                      </div>
                      <div className="customer-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="customer-name" style={{ fontWeight: '600', fontSize: '16px' }}>{q.userId.name}</span>
                          {q.priority === 'priority' && <Badge status="priority" label="Priority" />}
                        </div>
                        <span className="wait-time" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Est. wait: {q.position * business.avgServiceTimeMinutes} mins
                        </span>
                      </div>
                    </div>
                    {q.priority !== 'priority' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        icon={ArrowUp} 
                        onClick={async () => {
                          try {
                            await axios.patch(`/queue/priority/${q._id}`);
                          } catch (err) {
                            alert(err.response?.data?.message || 'Failed to prioritize');
                          }
                        }}
                        style={{ width: '100%', maxWidth: '120px' }}
                      >
                        Elevate
                      </Button>
                    )}
                  </div>
                ))}

                {queueList.filter(q => q.status === 'waiting').length === 0 && (
                  <p className="empty-state text-center" style={{ textAlign: 'center' }}>Queue is currently empty.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OwnerQueue;
