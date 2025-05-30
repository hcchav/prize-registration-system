import React from "react";
import "./globals.css";




export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full  font-display">
        {children}
      </body>
    </html>
  );
}
