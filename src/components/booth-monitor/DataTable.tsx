// No longer need to import PRIZES as we'll use colors from the database

export interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  prize?: string;
  prizeColor?: string | null;
  prizeDisplayText?: string | null;
}

interface DataTableProps {
  data: Attendee[];
  loading: boolean;
}

const formatRegNumber = (id: string) => {
  const num = parseInt(id);
  return num.toString().padStart(4, '0');
};

export function DataTable({ data, loading }: DataTableProps) {
  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 2px 8px 0 rgba(0,39,57,0.06)', padding: '2rem' }}>
        <div className="animate-pulse">
          <div style={{ height: '1rem', background: '#e5e7eb', borderRadius: '0.5rem', width: '75%', marginBottom: '1rem' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: '1rem', background: '#e5e7eb', borderRadius: '0.5rem' }}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 2px 8px 0 rgba(0,39,57,0.06)', padding: '0', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
        <thead>
          <tr>
            <th
              style={{
                color: 'var(--brand-navy-500)',
                // background: 'var()',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '1rem 1.5rem',
                fontSize: '0.95rem',
                textAlign: 'left',
                borderBottom: '2px solid var(--brand-navy-100)'
              }}
            >
              Reg #
            </th>
            <th
              style={{
                color: 'var(--brand-navy-500)',
                // background: 'var()',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '1rem 1.5rem',
                fontSize: '0.95rem',
                textAlign: 'left',
                borderBottom: '2px solid var(--brand-navy-100)'
              }}
            >
              Name
            </th>
            <th
              style={{
                color: 'var(--brand-navy-500)',
                // background: 'var()',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '1rem 1.5rem',
                fontSize: '0.95rem',
                textAlign: 'left',
                borderBottom: '2px solid var(--brand-navy-100)'
              }}
            >
              Company
            </th>
            <th
              style={{
                color: 'var(--brand-navy-500)',
                // background: 'var()',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '1rem 1.5rem',
                fontSize: '0.95rem',
                textAlign: 'left',
                borderBottom: '2px solid var(--brand-navy-100)'
              }}
            >
              Prize
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((attendee, idx) => (
            <tr key={attendee.id} style={{ borderBottom: '1px solid var(--brand-navy-100)' }}>
              <td style={{ padding: '1rem 1.5rem', fontWeight: 800, color: 'var(--brand-navy-500)', fontSize: '1.1rem', fontFamily: 'inherit' }}>
                {formatRegNumber(attendee.id)}
              </td>
              <td style={{ padding: '1rem 1.5rem', color: 'var(--brand-navy-500)', fontWeight: 600, fontSize: '1rem', fontFamily: 'inherit' }}>
                {attendee.firstName} {attendee.lastName.charAt(0)}.
              </td>
              <td style={{ padding: '1rem 1.5rem', color: 'var(--brand-navy-500)', fontSize: '1rem', fontFamily: 'inherit' }}>
                {attendee.company}
              </td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <span
                  style={{
                    backgroundColor: attendee.prizeColor || '#e5e7eb', // Use color from database or fallback to gray
                    color: attendee.prizeColor ? '#000000' : '#666', // Use black text for colored backgrounds, gray for unclaimed
                    fontWeight: 700,
                    borderRadius: '1rem',
                    padding: '0.4rem 1rem',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                  }}
                >
                  {attendee.prize || 'Prize Not Assigned'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 