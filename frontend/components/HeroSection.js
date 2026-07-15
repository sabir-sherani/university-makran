import React from 'react';

export default function HeroSection({ title, subtitle, backgroundImage }) {
  return (
    <div
      className="relative h-96 bg-cover bg-center"
      style={{
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : 'linear-gradient(135deg, #041476 0%, #FA7902 100%)',
      }}
    >
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative h-full flex flex-col justify-center items-center text-white text-center">
        <h1 className="text-5xl font-bold mb-4">{title}</h1>
        {subtitle && <p className="text-2xl">{subtitle}</p>}
      </div>
    </div>
  );
}
