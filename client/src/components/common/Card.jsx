import React from 'react';

const Card = ({
  children,
  className = '',
  style = {},
  onClick,
  hover = false
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl transition-all duration-200 ${
        hover ? 'hover:border-slate-700 hover:shadow-2xl cursor-pointer' : ''
      } ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default Card;
