// No longer need to import PRIZES as we'll use colors from the database

export interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  prize?: string;
  prizeColor?: string | null;
  prizeDisplayText?: string | null;
  claim_id?: string | null;
}

interface DataTableProps {
  data: Attendee[];
  loading: boolean;
}

const formatClaimNumber = (claim_id: string | null | undefined) => {
  if (!claim_id) return '----';
  const num = parseInt(claim_id);
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
    <div style={{ 
      background: 'white', 
      borderRadius: '5px', 
      border: '1px solid #abcae9',
      boxShadow: '0 2px 8px 0 rgba(0,39,57,0.06)', 
      padding: '0', 
      width: '100%',
      overflow: 'hidden' 
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
        <thead style={{ backgroundColor: 'aliceblue' }}>
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
                borderBottom: '1px solid #abcae9',
                width: '10%'
              }}
            >
              Claim #
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
                width: '20%',
                borderBottom: '1px solid #abcae9'
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
                borderBottom: '1px solid #abcae9',
                width: '30%'
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
                borderBottom: '1px solid #abcae9',
                width: '30%'
              }}
            >
              Prize
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((attendee, idx) => (
            <tr key={attendee.id} style={{ borderBottom: '1px solid #abcae9' }}>
              <td style={{ padding: '1rem 1.5rem', fontWeight: 800, color: 'var(--brand-navy-500)', fontSize: '1.1rem', fontFamily: 'inherit' }}>
                {formatClaimNumber(attendee.claim_id)}
              </td>
              <td style={{ padding: '1rem 1.5rem', color: 'var(--brand-navy-500)', fontWeight: 600, fontSize: '1rem', fontFamily: 'inherit' }}>
                {attendee.firstName} {attendee.lastName.charAt(0)}.
              </td>
              <td style={{ padding: '1rem 1.5rem', color: 'var(--brand-navy-500)', fontSize: '1rem', fontFamily: 'inherit' }}>
                {attendee.company}
              </td>
              <td style={{
                padding: '0.5rem 1rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '30%',
                minWidth: '150px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden'
                }}>
                  <span
                    style={{
                      backgroundColor: attendee.prizeColor || '#e5e7eb',
                      color: attendee.prizeColor ? '#FFFFFF' : '#666',
                      fontWeight: 700,
                      borderRadius: '1rem',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'inline-block',
                      maxWidth: '100%',
                      lineHeight: '1.2',
                      textAlign: 'center'
                    }}
                  >
                    {attendee.prize || 'Prize Not Assigned'}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 