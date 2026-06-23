import './globals.css';
import { MechanicAuthProvider } from './components/mechanic/MechanicAuthContext';

export const metadata = {
  title: 'Veriium (migrated)'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <MechanicAuthProvider>
          {children}
        </MechanicAuthProvider>
      </body>
    </html>
  );
}
