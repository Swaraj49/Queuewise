import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, UserX, TrendingUp, Clock, Calendar } from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';

const OwnerAnalytics = () => {
  const { analytics, analyticsLoading } = useOutletContext();

  if (analyticsLoading || !analytics) {
    return (
      <div className="owner-subpage w-full">
        <div className="subpage-header" style={{ marginBottom: '24px' }}>
          <h1>Business Insights & Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Performance trends, wait times, no-show rates, and revenue metrics.</p>
        </div>

        {/* 3 Stat Cards skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">
          {[1, 2, 3].map(n => (
            <Card key={n} style={{ minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Skeleton variant="circle" width="20px" height="20px" />
                <Skeleton variant="text" width="50%" height="14px" />
              </div>
              <Skeleton variant="text" width="40%" height="32px" className="mb-2" />
              <Skeleton variant="text" width="60%" height="12px" />
            </Card>
          ))}
        </div>

        {/* 2-Column charts layout skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {[1, 2, 3, 4].map(n => (
            <Card key={n} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Skeleton variant="circle" width="20px" height="20px" />
                <Skeleton variant="text" width="120px" height="16px" />
              </div>
              <Skeleton height="260px" width="100%" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Find peak traffic hour
  const peakHourObj = [...(analytics.hourlyData || [])].sort((a, b) => b.count - a.count)[0];
  const peakHourFormatted = peakHourObj ? `${peakHourObj.hour}:00` : 'N/A';

  return (
    <div className="owner-subpage w-full">
      <div className="subpage-header" style={{ marginBottom: '24px' }}>
        <h1>Business Insights & Analytics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Performance trends, wait times, no-show rates, and revenue metrics.</p>
      </div>

      {/* Stat cards in their own row above the charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">
        <Card style={{ minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <UserX className="w-5 h-5 text-rose-400" />
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>No-Show Rate</h3>
          </div>
          <div className="stat-value" style={{ color: analytics.noShowRate > 20 ? '#ef4444' : '#10b981', fontSize: '32px' }}>
            {analytics.noShowRate}%
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {analytics.noShowRate > 20 ? 'Action recommended to reduce no-shows' : 'Excellent customer arrival rate'}
          </span>
        </Card>

        <Card style={{ minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Users className="w-5 h-5 text-purple-400" />
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Served This Week</h3>
          </div>
          <div className="stat-value" style={{ color: '#8b5cf6', fontSize: '32px' }}>
            {analytics.servedThisWeek}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Completed customer visits
          </span>
        </Card>

        <Card style={{ minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <DollarSign className="w-5 h-5 text-amber-400" />
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Revenue This Week</h3>
          </div>
          <div className="stat-value" style={{ color: '#fbbf24', fontSize: '32px' }}>
            ${analytics.totalRevenueThisWeek.toFixed(2)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Aggregated in-service checkouts
          </span>
        </Card>
      </div>

      {/* Charts arranged in a 2-column grid on desktop, stacking to 1 column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Revenue Chart */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <DollarSign className="w-5 h-5 text-amber-400" />
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>Revenue by Hour</h3>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={analytics.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" tickFormatter={(h) => `${h}:00`} style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tickFormatter={(val) => `$${val}`} style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} formatter={(val) => `$${val.toFixed(2)}`} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="revenue" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Wait Time Chart */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>Avg Wait Time (Mins)</h3>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={analytics.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" tickFormatter={(h) => `${h}:00`} style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="avgWaitTimeMinutes" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Traffic Chart */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>Traffic Volume (Peak Hours)</h3>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={analytics.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" tickFormatter={(h) => `${h}:00`} style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Dynamic Peak Performance Insights Card */}
        <Card style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Calendar className="w-5 h-5 text-blue-400" />
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', fontWeight: '600' }}>Peak Window Insights</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            Your business traffic peaks at **{peakHourFormatted}** during the day. Consider scheduling additional staff or allocating extra service tables around this hour to keep average wait times under control.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Badge status="priority" label={`Peak Hour: ${peakHourFormatted}`} />
            <Badge status="waiting" label={`Avg Wait: ${peakHourObj?.avgWaitTimeMinutes || 0}m`} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OwnerAnalytics;
