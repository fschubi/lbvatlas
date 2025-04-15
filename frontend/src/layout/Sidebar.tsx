import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Drawer,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Computer as DevicesIcon,
  VpnKey as LicensesIcon,
  VerifiedUser as CertificatesIcon,
  Devices as AccessoriesIcon,
  Description as DocumentsIcon,
  Inventory as InventoryIcon,
  ConfirmationNumber as TicketsIcon,
  CheckCircle as TodosIcon,
  AssessmentOutlined as ReportsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Person as UsersIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface SubMenuItem {
  text: string;
  path: string;
  icon?: React.ReactNode;
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  expandable?: boolean;
  adminOnly?: boolean;
  subItems?: SubMenuItem[];
}

const drawerWidthOpen = 240;
const drawerWidthCollapsed = 72;

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSubMenuToggle = (text: string) => {
    setOpenSubMenu(openSubMenu === text ? null : text);
  };

  const menuItems: MenuItem[] = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Geräte', icon: <DevicesIcon />, path: '/devices' },
    { text: 'Lizenzen', icon: <LicensesIcon />, path: '/licenses' },
    { text: 'Zertifikate', icon: <CertificatesIcon />, path: '/certificates' },
    { text: 'Zubehör', icon: <AccessoriesIcon />, path: '/accessories' },
    { text: 'Dokumente', icon: <DocumentsIcon />, path: '/documents' },
    { text: 'Inventur', icon: <InventoryIcon />, path: '/inventory' },
    { text: 'Tickets', icon: <TicketsIcon />, path: '/tickets' },
    { text: 'Aufgaben', icon: <TodosIcon />, path: '/todos' },
    { text: 'Berichte', icon: <ReportsIcon />, path: '/reports' },
    { text: 'Benutzer', icon: <UsersIcon />, path: '/users' },
    {
      text: 'Administration',
      icon: <AdminIcon />,
      path: '/admin',
      expandable: true,
      adminOnly: true,
      subItems: [
        { text: 'Rollen & Berechtigungen', path: '/admin/roles', icon: <SecurityIcon /> }
      ]
    },
    { text: 'Einstellungen', icon: <SettingsIcon />, path: '/settings' },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidthOpen : drawerWidthCollapsed,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        '& .MuiDrawer-paper': {
          width: open ? drawerWidthOpen : drawerWidthCollapsed,
          transition: theme => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
          overflowX: 'hidden',
          boxSizing: 'border-box',
          mt: '64px',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <List>
        {/* Hauptmenü */}
        {menuItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null;

          if (item.expandable && open) {
            const isSubMenuOpen = openSubMenu === item.text;
            const isSubItemSelected = item.subItems?.some(subItem =>
              location.pathname.startsWith(subItem.path)
            );

            return (
              <React.Fragment key={item.text}>
                <Tooltip title={!open ? item.text : ''} placement="right">
                  <ListItem disablePadding sx={{ display: 'block' }}>
                    <ListItemButton
                      selected={isSubItemSelected}
                      onClick={() => handleSubMenuToggle(item.text)}
                      sx={{
                        minHeight: 48,
                        justifyContent: open ? 'initial' : 'center',
                        px: 2.5,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.dark',
                          '&:hover': { backgroundColor: 'primary.dark' },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: open ? 3 : 'auto',
                          justifyContent: 'center',
                          color: 'inherit',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0 }} />
                      {open && (isSubMenuOpen ? <ExpandLess /> : <ExpandMore />)}
                    </ListItemButton>
                  </ListItem>
                </Tooltip>

                {open && (
                  <Collapse in={isSubMenuOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.subItems?.map(subItem => {
                        const selected = location.pathname.startsWith(subItem.path);
                        return (
                          <ListItemButton
                            key={subItem.text}
                            selected={selected}
                            sx={{
                              pl: 4,
                              '&.Mui-selected': {
                                backgroundColor: 'primary.dark',
                                '&:hover': { backgroundColor: 'primary.dark' },
                              },
                            }}
                            onClick={() => handleNavigate(subItem.path)}
                          >
                            {subItem.icon && (
                              <ListItemIcon
                                sx={{
                                  minWidth: 0,
                                  mr: 3,
                                  justifyContent: 'center',
                                  color: 'inherit',
                                }}
                              >
                                {subItem.icon}
                              </ListItemIcon>
                            )}
                            <ListItemText primary={subItem.text} />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          }

          const selected = location.pathname.startsWith(item.path);
          return (
            <Tooltip key={item.text} title={!open ? item.text : ''} placement="right">
              <ListItem disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  selected={selected}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.dark',
                      '&:hover': { backgroundColor: 'primary.dark' },
                    },
                  }}
                  onClick={() => {
                    if (item.expandable && !open) {
                      handleSubMenuToggle(item.text);
                    } else {
                      handleNavigate(item.path);
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : 'auto',
                      justifyContent: 'center',
                      color: 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0 }} />
                </ListItemButton>
              </ListItem>
            </Tooltip>
          );
        })}
      </List>
      <Divider />
    </Drawer>
  );
};

export default Sidebar;
