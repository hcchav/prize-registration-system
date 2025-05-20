'use client';

import { useState, useEffect } from 'react';
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
    <div
      style={{
        minHeight: '100vh',
        // background: 'var(--brand-lightblue-50)',
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
            textTransform: 'uppercase',
            textAlign: 'center',
            fontSize: '2.5rem',
            marginBottom: '2rem'
          }}
        >
          Biome Brigade Prize Dashboard
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
  );
} 