import type {Metadata} from 'next';
import './globals.css';
import { Inter, Space_Grotesk as SpaceGrotesk } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Providers } from './providers';

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const fontHeadline = SpaceGrotesk({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: 'AttendEase',
  description: 'A Class and Attendance Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{colorScheme: 'dark'}} suppressHydrationWarning>
      <body className={cn(fontBody.variable, fontHeadline.variable, "font-body antialiased")}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
