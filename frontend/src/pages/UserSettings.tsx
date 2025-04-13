import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import MainLayout from '../layout/MainLayout';
import UserProfileSettings from '../components/users/UserProfileSettings';

const UserSettings: React.FC = () => {
  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Benutzereinstellungen
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Verwalten Sie Ihr Profil, Passwort und persönliche Einstellungen.
        </Typography>

        <UserProfileSettings />
      </Box>
    </MainLayout>
  );
};

export default UserSettings;
