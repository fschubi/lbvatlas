import React from 'react';
import { Box, Typography, Alert, Paper } from '@mui/material';

interface UserDocumentsTabProps {
  userId: number | null;
  userName: string;
  isReadOnly?: boolean;
}

const UserDocumentsTab: React.FC<UserDocumentsTabProps> = ({ userId, userName, isReadOnly = false }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Dokumente für {userName}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Alert severity="info">
          Die Dokumentenverwaltung für Benutzer wird in einem zukünftigen Update implementiert.
        </Alert>
      </Paper>
    </Box>
  );
};

export default UserDocumentsTab;
