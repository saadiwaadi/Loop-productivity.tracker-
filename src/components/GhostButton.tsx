import React from 'react';

interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
}

export default function GhostButton({ children, className = '', ...props }: GhostButtonProps) {
  return (
    <button className={`ghost-btn ${className}`} {...props}>
      {children}
    </button>
  );
}
