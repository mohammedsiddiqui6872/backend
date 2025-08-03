import React from 'react';

interface SkipLinkProps {
  target: string;
  children: React.ReactNode;
}

const SkipLink: React.FC<SkipLinkProps> = ({ target, children }) => {
  return (
    <a
      href={`#${target}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-md z-50"
    >
      {children}
    </a>
  );
};

export default SkipLink;