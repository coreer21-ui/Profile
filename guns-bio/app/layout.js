import './globals.css';

export const metadata = {
  title: 'Fauxx',
  description: 'Private bio pages'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
