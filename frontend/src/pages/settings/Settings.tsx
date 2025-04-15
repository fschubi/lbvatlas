import React from 'react';
import { Box } from '@mui/material';
import SettingsRoutes from './SettingsRoutes';

const SettingsPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <SettingsRoutes />
    </Box>
  );
};

export default SettingsPage;
