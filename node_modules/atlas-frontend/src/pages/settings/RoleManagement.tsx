import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

// Beispieldaten für die Rollenverwaltung
const sampleRoles = [
  { id: 1, name: 'Administrator', description: 'Voller Systemzugriff', permissions: 24, is_system: true },
  { id: 2, name: 'Manager', description: 'Erweiterte Berechtigungen', permissions: 18, is_system: true },
  { id: 3, name: 'Support', description: 'Technischer Support', permissions: 12, is_system: false },
  { id: 4, name: 'Benutzer', description: 'Basis-Berechtigungen', permissions: 6, is_system: false },
  { id: 5, name: 'Gast', description: 'Eingeschränkter Zugriff', permissions: 3, is_system: false }
];

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState(sampleRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const handleRoleSelect = (roleId: number) => {
    setSelectedRoleId(roleId);
  };

  return (
    <Box sx={{ p: 3, maxWidth: '100%' }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Rollenverwaltung
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              size="small"
            >
              Neue Rolle erstellen
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Benutzerrollen
            </Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Beschreibung</TableCell>
                    <TableCell align="center">Berechtigungen</TableCell>
                    <TableCell align="center">Systemrolle</TableCell>
                    <TableCell align="center">Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow
                      key={role.id}
                      onClick={() => handleRoleSelect(role.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selectedRoleId === role.id ? 'action.selected' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {role.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell align="center">{role.permissions}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={role.is_system ? "Ja" : "Nein"}
                          color={role.is_system ? "primary" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <IconButton size="small" color="primary">
                            <SecurityIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="secondary"
                            disabled={role.is_system}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={role.is_system}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {selectedRoleId && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Berechtigungen für {roles.find(r => r.id === selectedRoleId)?.name}
              </Typography>
              <Typography variant="body2">
                Hier können Sie die Berechtigungen für die ausgewählte Rolle verwalten.
                In der Produktivversion würden hier die einzelnen Berechtigungen mit Checkboxen angezeigt.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default RoleManagement;
