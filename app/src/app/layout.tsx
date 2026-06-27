import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Coding Quest Generator',
  description: 'Themed coding quests woven by AI.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
