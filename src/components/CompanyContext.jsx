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
        if (user?.role === 'admin') {
          setAllowedCompanies(["Fisher's Enterprise", "Pencroft Structures"]);
        } else {
          // Fetch user's company access from UserCompanyAccess entity
          const userAccess = await base44.entities.UserCompanyAccess.filter({ user_email: user.email });
          const companies = userAccess.map(a => a.company_id);
          
          if (companies.length > 0) {
            setAllowedCompanies(companies);
            // Auto-select first allowed company if current selection is not allowed
            if (!companies.includes(selectedCompany)) {
              setSelectedCompany(companies[0]);
            }
          } else {
            // Default fallback
            setAllowedCompanies(["Fisher's Enterprise"]);
          }
        }
      } catch (error) {
        console.error('Error fetching user access:', error);
        setAllowedCompanies(["Fisher's Enterprise"]);
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