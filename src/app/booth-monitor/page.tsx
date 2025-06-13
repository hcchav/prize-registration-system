'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { DataTable } from '../../components/booth-monitor/DataTable';
import type { Attendee } from '../../components/booth-monitor/DataTable';

export default function BoothMonitor() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendees = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/attendees');
      const data = await response.json();
      
      if (data.success) {
        setAttendees(data.attendees);
      } else {
        setError(data.error || 'Failed to fetch attendees');
      }
    } catch (err) {
      setError('An error occurred while fetching attendees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  return (
    <div className="min-h-auto mb-20 bg-white">
      <div id="registration-header" className="fixed top-0 left-0 right-0 z-50 w-full flex justify-center items-center h-15 bg-white shadow-sm">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#abcae9] to-transparent"></div>
        <div className="w-60 h-12 relative">
          <Image
            src="/Mockup.svg"
            alt="Registration Header"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
      
      <div className="pt-16">
        <div
          style={{
            minHeight: '100vh',
            fontFamily: "'Poppins', 'Inter', Arial, sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              background: 'var(--brand-lightblue-400)',
              borderRadius: '2rem',
              boxShadow: '0 8px 32px 0 rgba(0,39,57,0.10)',
              padding: '3rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <h1
              style={{
                color: 'var(--brand-navy-500)',
                fontFamily: "'Poppins', 'Inter', Arial, sans-serif",
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'none',
                textAlign: 'center',
                fontSize: '2.5rem',
                marginBottom: '2rem'
              }}
            >
              Prize Dashboard
            </h1>
            {error ? (
              <div
                style={{
                  background: 'var(--brand-red-50)',
                  color: 'var(--brand-red-500)',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  textAlign: 'center',
                  width: '100%'
                }}
              >
                {error}
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                <DataTable data={attendees} loading={loading} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}