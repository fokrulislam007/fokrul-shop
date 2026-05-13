'use client';
import { Phone } from 'lucide-react';

/**
 * Full-screen non-dismissible overlay shown when a client site is paused or expired.
 * Displays "Construct with MOREX" and a call button.
 */
export default function LicenseBlockOverlay({ contactPhone }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgb(255 255 255 / 85%)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, rgb(255 255 255), rgb(255 255 255))',
          borderRadius: '24px',
          padding: '48px',
          textAlign: 'center',
          maxWidth: '420px',
          width: '90%',
          boxShadow: 'rgb(243 233 233 / 50%) 0px 25px 60px, rgba(255, 255, 255, 0.05) 0px 0px 0px 1px',
        }}
      >
        {/* Logo / Brand Mark */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 900,
            color: 'rgb(0 0 0)',
            letterSpacing: '-0.02em',
            marginBottom: '12px',
            lineHeight: 1.2,
          }}
        >
          Please contact with our support team
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '14px',
            color: 'rgb(127 125 125 / 86%)',
            marginBottom: '32px',
            lineHeight: 1.6,
          }}
        >
          Your site access has been paused. Please contact support to restore access.
        </p>

        {/* Call Button */}
        {contactPhone && (
          <a
            href={`tel:${contactPhone}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(16, 185, 129, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.3)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Call {contactPhone}
          </a>
        )}
      </div>
    </div>
  );
}
