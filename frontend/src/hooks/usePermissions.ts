import { useState, useEffect } from 'react';
import { useApi } from './useApi';

interface Permission {
  id: number;
  name: string;
  description?: string;
  module: string;
  action: string;
}

export const usePermissions = () => {
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const response = await api.get('/users/permissions');
        setUserPermissions(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Berechtigungen:', error);
        setUserPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  return {
    userPermissions,
    loading,
    hasPermission: (permission: string) => userPermissions.includes(permission)
  };
};
