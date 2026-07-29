import React from 'react';

const Badge = ({
  status = 'waiting', // 'waiting' | 'in-service' | 'completed' | 'no-show' | 'priority' | 'category' | 'custom'
  label,
  icon: Icon = null,
  className = '',
  style = {}
}) => {
  const statusConfig = {
    waiting: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      defaultLabel: 'Waiting'
    },
    'in-service': {
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      defaultLabel: 'In-Service'
    },
    completed: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      defaultLabel: 'Completed'
    },
    'no-show': {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      defaultLabel: 'No-Show'
    },
    cancelled: {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      defaultLabel: 'Cancelled'
    },
    priority: {
      bg: 'bg-purple-500/15',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      defaultLabel: 'Priority'
    },
    category: {
      bg: 'bg-slate-800/80',
      text: 'text-slate-200',
      border: 'border-slate-700/80',
      defaultLabel: 'Category'
    },
    custom: {
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
      defaultLabel: 'Tag'
    }
  };

  const config = statusConfig[status] || statusConfig.custom;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border backdrop-blur-sm ${config.bg} ${config.text} ${config.border} ${className}`}
      style={{ lineHeight: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span style={{ display: 'inline-block', transform: 'translateY(0.5px)' }}>{displayLabel}</span>
    </span>
  );
};

export default Badge;
