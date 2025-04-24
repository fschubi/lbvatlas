import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography
} from '@mui/material';
import {
  Person as PersonIcon,
  Computer as DeviceIcon,
  VpnKey as LicenseIcon,
  Inventory as InventoryIcon,
  Description as DocumentIcon,
  Assignment as ProtocolIcon,
  Settings as SettingsIcon,
  Security as CertificateIcon
} from '@mui/icons-material';

// TabPanel-Komponente für die Anzeige der verschiedenen Tabs
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Props für die Haupt-Komponente
interface UserDetailTabsProps {
  // Callback-Funktionen für die verschiedenen Tabs
  profileContent: React.ReactNode;
  devicesContent: React.ReactNode;
  licensesContent: React.ReactNode;
  certificatesContent?: React.ReactNode;
  accessoriesContent?: React.ReactNode;
  inventoryContent?: React.ReactNode;
  documentsContent?: React.ReactNode;
  settingsContent?: React.ReactNode;
  protocolsContent?: React.ReactNode;
  // Benutzerdaten
  userData?: any;
  // Zusätzliche Optionen
  initialTab?: number;
  onTabChange?: (tabIndex: number) => void;
}

const UserDetailTabs: React.FC<UserDetailTabsProps> = ({
  profileContent,
  devicesContent,
  licensesContent,
  certificatesContent,
  accessoriesContent,
  inventoryContent,
  documentsContent,
  settingsContent,
  protocolsContent,
  userData,
  initialTab = 0,
  onTabChange
}) => {
  const [tabValue, setTabValue] = React.useState(initialTab);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (onTabChange) {
      onTabChange(newValue);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="Benutzerdetails Tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PersonIcon />} label="Profil" id="user-tab-0" aria-controls="user-tabpanel-0" />
          <Tab icon={<DeviceIcon />} label="Geräte" id="user-tab-1" aria-controls="user-tabpanel-1" />
          <Tab icon={<LicenseIcon />} label="Lizenzen" id="user-tab-2" aria-controls="user-tabpanel-2" />
          <Tab icon={<CertificateIcon />} label="Zertifikate" id="user-tab-3" aria-controls="user-tabpanel-3" />
          {accessoriesContent && (
            <Tab icon={<InventoryIcon />} label="Zubehör" id="user-tab-4" aria-controls="user-tabpanel-4" />
          )}
          {inventoryContent && (
            <Tab icon={<InventoryIcon />} label="Inventur" id="user-tab-5" aria-controls="user-tabpanel-5" />
          )}
          {documentsContent && (
            <Tab icon={<DocumentIcon />} label="Dokumente" id="user-tab-6" aria-controls="user-tabpanel-6" />
          )}
          {protocolsContent && (
            <Tab icon={<ProtocolIcon />} label="Übergabeprotokolle" id="user-tab-7" aria-controls="user-tabpanel-7" />
          )}
          {settingsContent && (
            <Tab icon={<SettingsIcon />} label="Einstellungen" id="user-tab-8" aria-controls="user-tabpanel-8" />
          )}
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {profileContent}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {devicesContent}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {licensesContent}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {certificatesContent}
      </TabPanel>

      {accessoriesContent && (
        <TabPanel value={tabValue} index={4}>
          {accessoriesContent}
        </TabPanel>
      )}

      {inventoryContent && (
        <TabPanel value={tabValue} index={5}>
          {inventoryContent}
        </TabPanel>
      )}

      {documentsContent && (
        <TabPanel value={tabValue} index={6}>
          {documentsContent}
        </TabPanel>
      )}

      {protocolsContent && (
        <TabPanel value={tabValue} index={7}>
          {protocolsContent}
        </TabPanel>
      )}

      {settingsContent && (
        <TabPanel value={tabValue} index={8}>
          {settingsContent}
        </TabPanel>
      )}
    </Box>
  );
};

export default UserDetailTabs;
