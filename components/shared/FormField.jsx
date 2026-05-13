'use client';
import React from 'react';

/** Shared form field wrapper — must be defined OUTSIDE render functions to prevent remounts */
export default function FormField({ label, error, children, className }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-800 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
