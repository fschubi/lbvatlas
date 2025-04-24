import React, { useState, useCallback } from 'react';
import { Box, Paper, IconButton, Tooltip, TextField, InputAdornment } from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { TableVirtuoso } from 'react-virtuoso';
import { TableComponents } from '../common/TableComponents';
import { MenuAction } from '../common/TableContextMenu';
import { User } from '../../types/user';

interface UsersTableProps {
  users: User[];
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onLockToggle: (user: User) => void;
  onGroupAssign: (user: User) => void;
}

const columns = [
  { dataKey: 'username', label: 'Benutzername', width: 150 },
  { dataKey: 'display_name', label: 'Anzeigename', width: 200 },
  { dataKey: 'email', label: 'E-Mail', width: 250 },
  { dataKey: 'department', label: 'Abteilung', width: 150 },
  { dataKey: 'role', label: 'Rolle', width: 120 },
  { dataKey: 'last_login', label: 'Letzter Login', width: 180 },
  { dataKey: 'status', label: 'Status', width: 100 }
];

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  onView,
  onEdit,
  onDelete,
  onLockToggle,
  onGroupAssign
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState(users);

  // Suchfunktion
  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = users.filter(user =>
      user.username.toLowerCase().includes(term) ||
      user.display_name?.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.department?.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    );

    setFilteredUsers(filtered);
  }, [users]);

  // Kontextmenü-Aktionen
  const handleContextMenuAction = (action: MenuAction, user: User) => {
    switch (action) {
      case 'view':
        onView(user);
        break;
      case 'edit':
        onEdit(user);
        break;
      case 'delete':
        onDelete(user);
        break;
      case 'lock':
        onLockToggle(user);
        break;
      case 'groups':
        onGroupAssign(user);
        break;
    }
  };

  // Render der Tabellenzeile
  const rowContent = (index: number, user: User) => {
    return (
      <>
        <td>{user.username}</td>
        <td>{user.display_name}</td>
        <td>{user.email}</td>
        <td>{user.department}</td>
        <td>{user.role}</td>
        <td>{new Date(user.last_login).toLocaleString('de-DE')}</td>
        <td>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {user.active ? 'Aktiv' : 'Inaktiv'}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenuAction('lock', user);
              }}
            >
              {user.active ? <UnlockIcon /> : <LockIcon />}
            </IconButton>
          </Box>
        </td>
        <td>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Details anzeigen">
              <IconButton size="small" onClick={() => handleContextMenuAction('view', user)}>
                <ViewIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Bearbeiten">
              <IconButton size="small" onClick={() => handleContextMenuAction('edit', user)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Gruppen">
              <IconButton size="small" onClick={() => handleContextMenuAction('groups', user)}>
                <GroupIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Löschen">
              <IconButton
                size="small"
                onClick={() => handleContextMenuAction('delete', user)}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </td>
      </>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Suchfeld */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Benutzer suchen..."
        value={searchTerm}
        onChange={handleSearch}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          )
        }}
        sx={{ mb: 2 }}
      />

      {/* Tabelle */}
      <Paper sx={{ flexGrow: 1, height: 'calc(100vh - 250px)' }}>
        <TableVirtuoso
          data={filteredUsers}
          components={TableComponents}
          fixedHeaderContent={() => (
            <tr>
              {columns.map((column) => (
                <th key={column.dataKey} style={{ width: column.width }}>
                  {column.label}
                </th>
              ))}
              <th style={{ width: 120 }}>Aktionen</th>
            </tr>
          )}
          itemContent={rowContent}
        />
      </Paper>
    </Box>
  );
};
