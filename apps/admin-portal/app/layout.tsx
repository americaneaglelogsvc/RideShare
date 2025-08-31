import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Portal - Luxury Ride Platform',
  description: 'Administration dashboard for the luxury rideshare platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}