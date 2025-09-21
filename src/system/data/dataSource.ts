/**
 * Data Source Abstraction - Simplified for Body Scan
 * Simplified interface for essential data operations
 */

interface IDataSource {
  morphologyMapping: {
    getMapping: () => Promise<any>;
  };
}

let impl: IDataSource;

export function setDataSource(ds: IDataSource) {
  impl = ds;
}

function api(): IDataSource {
  if (!impl) {
    throw new Error('DataSource not set. Make sure DataProvider is mounted.');
  }
  return impl;
}

export const isMock = () => import.meta.env.VITE_MOCK_DATA === '1';