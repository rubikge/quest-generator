import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Python Quest Generator',
  description: 'Themed Python coding quests woven by AI.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
