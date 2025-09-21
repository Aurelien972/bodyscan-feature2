/**
 * Data Provider - Simplified for Body Scan
 * Central data layer provider with source switching
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { setDataSource, isMock } from '../../system/data/dataSource';

import { morphologyMappingRepo } from '../../system/data/repositories/morphologyMappingRepo';

// Create optimized QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute
      gcTime: 300_000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface DataProviderProps {
  children: ReactNode;
}

/**
 * Data Provider Component
 * Sets up React Query and data source implementations
 */
export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  React.useEffect(() => {
    // Configure data source based on environment
    
    setDataSource({
      morphologyMapping: morphologyMappingRepo,
    });
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      
      {/* React Query Devtools - only in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
};

