import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'WebhookLab — Webhook Inspection & Testing Gateway',
  description: 'Inspect, test, and debug webhooks in real-time. Provider auto-detection, signature verification, payload replay, and format transformation.',
  keywords: ['webhook', 'testing', 'debugging', 'stripe', 'github', 'shopify', 'slack'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
