import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  Avatar
} from '@mui/material';
import {
  Storage as BasicDataIcon,
  Business as DepartmentsIcon,
  Category as CategoriesIcon,
  LocationOn as LocationsIcon,
  MeetingRoom as RoomsIcon,
  Laptop as DeviceModelsIcon,
  Factory as ManufacturersIcon,
  LocalShipping as SuppliersIcon,
  Router as SwitchesIcon,
  NetworkWifi as PortsIcon,
  Cable as NetworkOutletsIcon,
  Key as KeyIcon
} from '@mui/icons-material';

interface BasicSettingCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const BasicSettings: React.FC = () => {
  const navigate = useNavigate();

  // Alle Grunddaten-Karten definieren
  const basicSettingsCards: BasicSettingCard[] = [
    {
      title: 'Abteilungen',
      description: 'Organisationsstrukturen und Abteilungen verwalten',
      icon: <DepartmentsIcon />,
      path: '/settings/departments',
      color: '#1976d2'
    },
    {
      title: 'Kategorien',
      description: 'Gerätekategorien, Lizenztypen und Zubehörkategorien verwalten',
      icon: <CategoriesIcon />,
      path: '/settings/categories',
      color: '#7b1fa2'
    },
    {
      title: 'Lizenztypen',
      description: 'Verschiedene Arten von Softwarelizenzen definieren',
      icon: <KeyIcon />,
      path: '/settings/license-types',
      color: '#ffa000'
    },
    {
      title: 'Standorte',
      description: 'Niederlassungen und geografische Standorte verwalten',
      icon: <LocationsIcon />,
      path: '/settings/locations',
      color: '#388e3c'
    },
    {
      title: 'Räume',
      description: 'Raumverwaltung und Raumzuordnungen konfigurieren',
      icon: <RoomsIcon />,
      path: '/settings/rooms',
      color: '#d32f2f'
    },
    {
      title: 'Gerätemodelle',
      description: 'Hardware-Modelle und Spezifikationen definieren',
      icon: <DeviceModelsIcon />,
      path: '/settings/device-models',
      color: '#0288d1'
    },
    {
      title: 'Hersteller',
      description: 'Hersteller von Geräten, Software und Zubehör verwalten',
      icon: <ManufacturersIcon />,
      path: '/settings/manufacturers',
      color: '#558b2f'
    },
    {
      title: 'Lieferanten',
      description: 'Lieferanten und Händler für Beschaffungen verwalten',
      icon: <SuppliersIcon />,
      path: '/settings/suppliers',
      color: '#5c6bc0'
    },
    {
      title: 'Switches',
      description: 'Netzwerk-Switches und deren Konfiguration verwalten',
      icon: <SwitchesIcon />,
      path: '/settings/switches',
      color: '#ef6c00'
    },
    {
      title: 'Ports',
      description: 'Netzwerk-Ports und deren Zuordnungen konfigurieren',
      icon: <PortsIcon />,
      path: '/settings/network-ports',
      color: '#00796b'
    },
    {
      title: 'Netzwerkdosen',
      description: 'Physische Netzwerkanschlüsse und deren Zuordnungen verwalten',
      icon: <NetworkOutletsIcon />,
      path: '/settings/network-sockets',
      color: '#303f9f'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center' }}>
        <BasicDataIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4">Grunddaten verwalten</Typography>
      </Paper>

      {/* Beschreibung */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="body1">
          Hier können Sie grundlegende Stammdaten wie Abteilungen, Standorte, Kategorien und Netzwerkkomponenten verwalten.
          Wählen Sie eine der Kategorien, um die entsprechenden Einstellungen vorzunehmen.
        </Typography>
      </Paper>

      {/* Grunddaten-Karten */}
      <Grid container spacing={2}>
        {basicSettingsCards.map((card, index) => (
          <Grid item key={index} xs={12} sm={6} md={4} lg={3}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                }
              }}
            >
              <CardActionArea
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                onClick={() => navigate(card.path)}
              >
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', p: 2 }}>
                  <Avatar sx={{ bgcolor: card.color, mr: 2 }}>
                    {card.icon}
                  </Avatar>
                  <Typography variant="h6" component="h2">
                    {card.title}
                  </Typography>
                </Box>
                <Divider sx={{ width: '100%' }} />
                <CardContent sx={{ flexGrow: 1, width: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default BasicSettings;
