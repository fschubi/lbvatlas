import React from 'react';
import { Box, Typography, Alert, Paper } from '@mui/material';

interface UserInventoryTabProps {
  userId: number | null;
  userName: string;
  isReadOnly?: boolean;
}

const UserInventoryTab: React.FC<UserInventoryTabProps> = ({ userId, userName, isReadOnly = false }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Inventardaten für {userName}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Alert severity="info">
          Die Inventarverwaltung für Benutzer wird in einem zukünftigen Update implementiert.
        </Alert>
      </Paper>
    </Box>
  );
};

export default UserInventoryTab;
