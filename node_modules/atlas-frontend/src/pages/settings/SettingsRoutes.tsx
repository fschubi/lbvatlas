import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import der Settings-Hauptseite
import Settings from '../Settings';

// Importieren der Settings-Komponenten
import RoleManagement from './RoleManagement';
import SystemSettings from '../admin/SystemSettings';
import BasicSettings from './BasicSettings';
import EmailNotifications from './EmailNotifications';
import AssetTags from './AssetTags';
import LabelPrinting from './LabelPrinting';
import Categories from './Categories';
import Departments from './Departments';
import DeviceModels from './DeviceModels';
import Locations from './Locations';
import Manufacturers from './Manufacturers';
import NetworkOutlets from './NetworkOutlets';
import Ports from './Ports';
import Rooms from './Rooms';
import Suppliers from './Suppliers';
import Switches from './Switches';

const SettingsRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Haupteinstellungsseite als Index-Route */}
      <Route index element={<Settings />} />

      {/* Settings-Unterseiten */}
      <Route path="roles" element={<RoleManagement />} />
      <Route path="system" element={<SystemSettings />} />
      <Route path="basic" element={<BasicSettings />} />
      <Route path="email-notifications" element={<EmailNotifications />} />
      <Route path="asset-tags" element={<AssetTags />} />
      <Route path="labels" element={<LabelPrinting />} />

      {/* Weitere Settings-Unterseiten */}
      <Route path="categories" element={<Categories />} />
      <Route path="departments" element={<Departments />} />
      <Route path="device-models" element={<DeviceModels />} />
      <Route path="locations" element={<Locations />} />
      <Route path="manufacturers" element={<Manufacturers />} />
      <Route path="network-outlets" element={<NetworkOutlets />} />
      <Route path="ports" element={<Ports />} />
      <Route path="rooms" element={<Rooms />} />
      <Route path="suppliers" element={<Suppliers />} />
      <Route path="switches" element={<Switches />} />
    </Routes>
  );
};

export default SettingsRoutes;
