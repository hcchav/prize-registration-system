'use client';

export function FontProvider() {
  return (
    <style jsx global>{`
      :root {
        --font-poppins: '__Poppins_51684b', Helvetica;
      }
      body {
        font-family: '__Poppins_51684b', Helvetica;
      }
      @font-face {
        font-family: '__Poppins_51684b';
        font-weight: 100 900;
        font-display: swap;
      }
    `}</style>
  );
}
