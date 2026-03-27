import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HYDRA DESIGNER — Visual Patch Editor',
  description:
    'A visual node editor for Hydra video synth. Build live-coding patches by connecting nodes instead of writing code. Powered by hydra-synth.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
