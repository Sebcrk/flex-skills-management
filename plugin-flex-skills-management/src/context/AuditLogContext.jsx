import React, { createContext, useContext, useState, useCallback } from 'react';

const AuditLogContext = createContext(undefined);

export const AuditLogProvider = ({ children }) => {
  const [entries, setEntries] = useState([]);

  const addEntry = useCallback((entry) => {
    const newEntry = {
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
    };
    setEntries((prev) => [newEntry, ...prev]);
  }, []);

  return (
    <AuditLogContext.Provider value={{ entries, addEntry }}>
      {children}
    </AuditLogContext.Provider>
  );
};

export const useAuditLog = () => {
  const context = useContext(AuditLogContext);
  if (!context) {
    throw new Error('useAuditLog must be used within an AuditLogProvider');
  }
  return context;
};
