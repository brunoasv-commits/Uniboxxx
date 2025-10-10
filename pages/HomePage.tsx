import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-center">
        <h1 
          className="text-7xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-600 animate-pulse"
          style={{
            textShadow: '0 0 10px rgba(56, 189, 248, 0.3), 0 0 20px rgba(37, 99, 235, 0.2)'
          }}
        >
          Uniboxxx
        </h1>
      </div>
    </div>
  );
};

export default HomePage;
