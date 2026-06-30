import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UIProvider } from '@/contexts/UIContext';
import { DemoAuthProvider } from '@/features/auth/DemoAuthContext';
import { OfflineProvider } from '@/offline/providers/OfflineProvider';
import { AppRoutes } from '@/routes/AppRoutes';

function getRouterBasename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (!base || base === './' || base === '/') return undefined;
  return base.replace(/\/$/, '');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter basename={getRouterBasename()}>
          <UIProvider>
            <DemoAuthProvider>
              <OfflineProvider>
                <AppRoutes />
                <Toaster />
                <Sonner />
              </OfflineProvider>
            </DemoAuthProvider>
          </UIProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
