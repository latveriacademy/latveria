import React from 'react';

export const LatveriaSeal = ({ size = 44, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`latveria-seal ${className}`}
      aria-label="Insignia Institusional Latveria"
    >
      {/* Outer Hexagonal Shield */}
      <polygon
        points="50,4 94,27 94,73 50,96 6,73 6,27"
        fill="var(--bg-card, #0E2419)"
        stroke="var(--accent-gold, #C5A059)"
        strokeWidth="2.5"
      />
      {/* Inner Inscribed Hexagon */}
      <polygon
        points="50,11 87,31 87,69 50,89 13,69 13,31"
        fill="none"
        stroke="var(--accent-gold, #C5A059)"
        strokeWidth="1"
        strokeDasharray="3 2"
        opacity="0.8"
      />
      {/* Concentric Precision Circles */}
      <circle
        cx="50"
        cy="50"
        r="28"
        stroke="var(--accent-gold, #C5A059)"
        strokeWidth="1.2"
        fill="var(--bg-primary, #091610)"
      />
      <circle
        cx="50"
        cy="50"
        r="24"
        stroke="var(--accent-gold, #C5A059)"
        strokeWidth="0.8"
        strokeDasharray="2 2"
        opacity="0.6"
      />

      {/* Latverian Monogram "L" - Crisp Geometric Typography */}
      <path
        d="M44 34 H50 V60 H64 V66 H44 Z"
        fill="var(--accent-gold, #C5A059)"
      />

      {/* Geometric Stars & Cardinal Marks */}
      <polygon points="50,16 52,21 57,21 53,24 55,29 50,26 45,29 47,24 43,21 48,21" fill="var(--accent-gold, #C5A059)" />
      <polygon points="50,84 52,79 57,79 53,76 55,71 50,74 45,71 47,76 43,79 48,79" fill="var(--accent-gold, #C5A059)" />
      <circle cx="21" cy="50" r="1.5" fill="var(--accent-gold, #C5A059)" />
      <circle cx="79" cy="50" r="1.5" fill="var(--accent-gold, #C5A059)" />
    </svg>
  );
};

export const LatveriaWatermark = ({ size = 280, opacity = 0.04 }) => {
  return (
    <div
      style={{
        position: 'absolute',
        right: '-40px',
        bottom: '-40px',
        pointerEvents: 'none',
        opacity: opacity,
        zIndex: 0
      }}
    >
      <LatveriaSeal size={size} />
    </div>
  );
};
