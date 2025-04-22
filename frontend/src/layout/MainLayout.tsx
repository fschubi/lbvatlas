import { useState, ReactNode } from 'react';
import { Box, CssBaseline } from '@mui/material';
import AtlasAppBar from '../components/AtlasAppBar';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

// Drawer-Breiten können hier bleiben oder in ein Theme/Konstanten verschoben werden
// const drawerWidthOpen = 240;
// const drawerWidthCollapsed = 72;

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      {/* Übergib die onMenuClick Funktion an die AppBar */}
      <AtlasAppBar onMenuClick={toggleSidebar} />
      {/* Die Sidebar Komponente selbst verwaltet ihre Breite basierend auf 'open' */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Die Hauptinhalts-Box */}
      <Box
        component="main"
        sx={{
          flexGrow: 1, // Nimmt den verfügbaren Platz ein
          pt: '64px', // Platz für die AppBar (Höhe anpassen, falls nötig)
          // ml und width werden nicht mehr benötigt, das Flex-Layout regelt das
          // transition für margin/width ist nicht mehr relevant
          overflow: 'auto', // Fügt Scrollbalken hinzu, falls Inhalt überläuft
        }}
      >
        {/* Innerer Container für Padding, um den Inhalt von den Rändern abzusetzen */}
        <Box sx={{ p: 3 }}> {/* Einheitliches Padding, z.B. p: 3 */}
          {children || <Outlet />}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
