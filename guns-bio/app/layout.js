import './globals.css';

export const metadata = {
  title: 'guns-bio',
  description: 'Personal bio pages'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
