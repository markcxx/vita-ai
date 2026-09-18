'use client';

import { createContext, useContext } from 'react';

interface RuntimeConfig {
  appName: string;
}

const RuntimeConfigContext = createContext<RuntimeConfig>({ appName: 'VitaAI' });

export function RuntimeConfigProvider({
  children,
  appName,
}: {
  children: React.ReactNode;
  appName: string;
}) {
  return (
    <RuntimeConfigContext.Provider value={{ appName }}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig() {
  return useContext(RuntimeConfigContext);
}
