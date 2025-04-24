import React from 'react';
import { Box, Typography, Alert, Paper } from '@mui/material';

interface UserSettingsTabProps {
  userId: number | null;
  userName: string;
  isReadOnly?: boolean;
}

const UserSettingsTab: React.FC<UserSettingsTabProps> = ({ userId, userName, isReadOnly = false }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Benutzereinstellungen für {userName}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Alert severity="info">
          Die Benutzereinstellungen werden in einem zukünftigen Update implementiert.
        </Alert>
      </Paper>
    </Box>
  );
};

export default UserSettingsTab;
