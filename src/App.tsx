import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UIProvider } from '@/contexts/UIContext';
import { DemoAuthProvider } from '@/features/auth/DemoAuthContext';
import { NavigationConfigProvider } from '@/contexts/NavigationConfigContext';
import { OfflineProvider } from '@/offline/providers/OfflineProvider';
import { AppRoutes } from '@/routes/AppRoutes';

function getRouterBasename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (!base || base === './' || base === '/') return undefined;
  return base.replace(/\/$/, '');
}

const routerBasename = getRouterBasename();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter basename={routerBasename}>
          <UIProvider>
            <NavigationConfigProvider>
              <DemoAuthProvider>
                <OfflineProvider>
                  <AppRoutes />
                  <Toaster />
                  <Sonner />
                </OfflineProvider>
              </DemoAuthProvider>
            </NavigationConfigProvider>
          </UIProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
