import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { Navbar } from '@/components/navbar';

export const metadata: Metadata = {
  title: 'ContentFlow v2 — Web App Manajemen Konten',
  description: 'Web app manajemen & publikasi konten sosial media (TikTok, Facebook, Instagram)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
