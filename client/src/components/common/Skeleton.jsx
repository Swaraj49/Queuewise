import React from 'react';

const Skeleton = ({ className = '', style = {}, variant = 'rect', width, height }) => {
  const baseClasses = 'animate-pulse bg-slate-800/80';
  
  let variantClasses = 'rounded-xl';
  if (variant === 'circle') {
    variantClasses = 'rounded-full';
  } else if (variant === 'text') {
    variantClasses = 'rounded h-4 my-1';
  }

  const customStyle = {
    width: width || undefined,
    height: height || undefined,
    ...style
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses} ${className}`} 
      style={customStyle}
    />
  );
};

export default Skeleton;
