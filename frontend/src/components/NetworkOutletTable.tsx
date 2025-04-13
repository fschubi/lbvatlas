import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import AtlasTable, { AtlasColumn } from './AtlasTable';
import networkOutletService from '../services/networkOutletService';
import { NetworkOutlet } from '../types/settings';

interface NetworkOutletTableProps {
  onRowClick?: (outlet: NetworkOutlet) => void;
  onEdit?: (outlet: NetworkOutlet) => void;
  onDelete?: (outlet: NetworkOutlet) => void;
  onView?: (outlet: NetworkOutlet) => void;
  heightPx?: number;
}

const NetworkOutletTable: React.FC<NetworkOutletTableProps> = ({
  onRowClick,
  onEdit,
  onDelete,
  onView,
  heightPx = 400
}) => {
  const [outlets, setOutlets] = useState<NetworkOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Spalten für die Tabelle definieren
  const columns: AtlasColumn<NetworkOutlet>[] = [
    {
      dataKey: 'id',
      label: 'ID',
      numeric: true,
      width: 70,
      sortable: true
    },
    {
      dataKey: 'outletNumber',
      label: 'Dosennummer',
      width: 150,
      sortable: true,
      filterable: true
    },
    {
      dataKey: 'locationName',
      label: 'Standort',
      width: 180,
      sortable: true,
      filterable: true
    },
    {
      dataKey: 'roomName',
      label: 'Raum',
      width: 180,
      sortable: true,
      filterable: true
    },
    {
      dataKey: 'description',
      label: 'Beschreibung',
      width: 250,
      filterable: true,
      render: (value) => value || '-'
    },
    {
      dataKey: 'wallPosition',
      label: 'Position',
      width: 120,
      render: (value) => value || '-'
    },
    {
      dataKey: 'isActive',
      label: 'Aktiv',
      width: 80,
      render: (value) => value ? 'Ja' : 'Nein'
    }
  ];

  // Daten beim ersten Laden abrufen
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await networkOutletService.getAllNetworkOutlets();
        setOutlets(data);
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Netzwerkdosen:', err);
        setError('Die Netzwerkdosen konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Sortieren der Daten
  const handleSort = (columnKey: string, direction: 'asc' | 'desc') => {
    const sortedData = [...outlets].sort((a, b) => {
      // Prüfen auf undefinierte Werte
      const aValue = a[columnKey as keyof NetworkOutlet];
      const bValue = b[columnKey as keyof NetworkOutlet];

      // Wenn einer der Werte undefined ist
      if (aValue === undefined) return direction === 'asc' ? -1 : 1;
      if (bValue === undefined) return direction === 'asc' ? 1 : -1;

      // String-Vergleich für Strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Numerischer Vergleich
      return direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    setOutlets(sortedData);
  };

  // Filterung der Daten
  const handleFilter = (columnKey: string, filterValue: string) => {
    if (!filterValue.trim()) {
      // Wenn der Filter leer ist, lade alle Daten neu
      networkOutletService.getAllNetworkOutlets().then(data => setOutlets(data));
      return;
    }

    // Ansonsten filtere lokal
    const lowerFilter = filterValue.toLowerCase();
    networkOutletService.getAllNetworkOutlets().then(data => {
      const filtered = data.filter(outlet => {
        const value = outlet[columnKey as keyof NetworkOutlet];
        if (value === undefined || value === null) return false;
        return String(value).toLowerCase().includes(lowerFilter);
      });
      setOutlets(filtered);
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <AtlasTable
      columns={columns}
      rows={outlets}
      heightPx={heightPx}
      onRowClick={onRowClick}
      onEdit={onEdit}
      onDelete={onDelete}
      onView={onView}
      onSort={handleSort}
      onFilter={handleFilter}
      emptyMessage="Keine Netzwerkdosen vorhanden"
    />
  );
};

export default NetworkOutletTable;
