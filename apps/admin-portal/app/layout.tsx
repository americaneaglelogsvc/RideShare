import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Portal - UrWay Dispatch',
  description: 'Administration dashboard for the urwaydispatch.com rideshare platform',
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