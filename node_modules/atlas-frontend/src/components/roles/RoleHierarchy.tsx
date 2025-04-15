import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import axios from 'axios';

// API-Basis-URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3500/api';

interface Role {
  id: number;
  name: string;
  description: string;
  parent_role_id: number | null;
  children: Role[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface RoleHierarchyProps {
  onHierarchyChanged?: () => void;
}

const RoleHierarchy: React.FC<RoleHierarchyProps> = ({ onHierarchyChanged }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [hierarchyTree, setHierarchyTree] = useState<Role[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  // Lade Daten beim ersten Rendern
  useEffect(() => {
    fetchRoles();
  }, []);

  // Rollen laden
  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<ApiResponse<Role[]>>(`${API_BASE_URL}/roles`);
      const rolesData = response.data.data;

      setRoles(rolesData);
      buildHierarchyTree(rolesData);
      setLoading(false);
    } catch (err) {
      console.error('Fehler beim Laden der Rollen:', err);
      setError('Fehler beim Laden der Rollenhierarchie');
      setLoading(false);
    }
  };

  // Hierarchiebaum aufbauen
  const buildHierarchyTree = (rolesData: Role[]) => {
    const roleMap = new Map<number, Role>();
    rolesData.forEach(role => {
      roleMap.set(role.id, { ...role, children: [] });
    });

    const tree: Role[] = [];
    roleMap.forEach(role => {
      if (role.parent_role_id === null) {
        tree.push(role);
      } else {
        const parent = roleMap.get(role.parent_role_id);
        if (parent) {
          parent.children.push(role);
        }
      }
    });

    setHierarchyTree(tree);
  };

  // Dialog öffnen
  const handleOpenDialog = (role: Role) => {
    setSelectedRole(role);
    setSelectedParentId(role.parent_role_id);
    setDialogOpen(true);
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRole(null);
    setSelectedParentId(null);
  };

  // Vererbung aktualisieren
  const handleUpdateHierarchy = async () => {
    if (!selectedRole) return;

    try {
      await axios.put(`${API_BASE_URL}/roles/${selectedRole.id}`, {
        parent_role_id: selectedParentId
      });

      await fetchRoles();
      if (onHierarchyChanged) {
        onHierarchyChanged();
      }

      handleCloseDialog();
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Rollenhierarchie:', err);
      setError('Fehler beim Aktualisieren der Rollenhierarchie');
    }
  };

  // Rekursive Funktion zum Rendern der Rollenknoten
  const renderRoleNode = (role: Role) => {
    return (
      <TreeItem
        key={role.id}
        nodeId={role.id.toString()}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
            <Typography variant="body2">{role.name}</Typography>
            <Box sx={{ ml: 'auto', display: 'flex' }}>
              <Tooltip title="Vererbung bearbeiten">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog(role);
                  }}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        }
      >
        {role.children.map(child => renderRoleNode(child))}
      </TreeItem>
    );
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
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Rollenhierarchie
      </Typography>

      <Paper sx={{ p: 2 }}>
        <TreeView
          defaultCollapseIcon={<RemoveIcon />}
          defaultExpandIcon={<AddIcon />}
          sx={{ flexGrow: 1 }}
        >
          {hierarchyTree.map(role => renderRoleNode(role))}
        </TreeView>
      </Paper>

      {/* Dialog für Vererbung bearbeiten */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>
          Vererbung bearbeiten: {selectedRole?.name}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Übergeordnete Rolle</InputLabel>
            <Select
              value={selectedParentId || ''}
              onChange={(e) => setSelectedParentId(e.target.value as number)}
              label="Übergeordnete Rolle"
            >
              <MenuItem value="">
                <em>Keine übergeordnete Rolle</em>
              </MenuItem>
              {roles
                .filter(role => role.id !== selectedRole?.id)
                .map(role => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleUpdateHierarchy} variant="contained" color="primary">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleHierarchy;
