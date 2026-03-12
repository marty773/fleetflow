import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [selectedCompany, setSelectedCompany] = useState("Fisher's Enterprise");
  const [allowedCompanies, setAllowedCompanies] = useState(["Fisher's Enterprise"]);
  const [loading, setLoading] = useState(false);

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, allowedCompanies, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
}