import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [selectedCompany, setSelectedCompany] = useState("Fisher's Enterprise");
  const [allowedCompanies, setAllowedCompanies] = useState(["Fisher's Enterprise", "Pencroft Structures"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAccess = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.Company && user.Company.length > 0) {
          setAllowedCompanies(user.Company);
          // Auto-select first allowed company if current selection is not allowed
          if (!user.Company.includes(selectedCompany)) {
            setSelectedCompany(user.Company[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching user access:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAccess();
  }, []);

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