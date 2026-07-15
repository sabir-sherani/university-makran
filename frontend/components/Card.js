import React from 'react';

export default function Card({ icon, title, description }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition hover:scale-105 transform">
      <div className="text-4xl text-accent mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-primary mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
