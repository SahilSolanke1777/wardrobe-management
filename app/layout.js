import { Instrument_Serif, DM_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const instrument = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-instrument' });
const dm = DM_Sans({ subsets: ['latin'], variable: '--font-dm' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono-plex' });

export const metadata = {
  title: 'Hanger — wardrobe & outfit studio',
  description: 'Your closet as an archive. Style it on the table, with a stylist that learns you.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrument.variable} ${dm.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
