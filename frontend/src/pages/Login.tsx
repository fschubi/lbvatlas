import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { styled } from '@mui/material/styles';

// Versuche, das Logo zu importieren (kann zur Laufzeit fehlschlagen)
let logoPath = '';
try {
  // Korrekter Pfad zum Logo im public-Verzeichnis
  logoPath = '/ATLAS_Logo_schmal.png';
} catch (error) {
  console.error('Logo konnte nicht geladen werden', error);
}

// Benutzerdefiniertes TextField mit immer dunklem Hintergrund
const DarkTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#121212',
    '&.Mui-focused': {
      backgroundColor: '#121212',
    },
    '&:hover': {
      backgroundColor: '#121212',
    },
    '&.Mui-error': {
      backgroundColor: '#121212',
    },
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.23)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.23)',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '& input, & textarea': {
      backgroundColor: '#121212',
      color: theme.palette.text.primary,
    },
    '& input:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 1000px #121212 inset',
      WebkitTextFillColor: theme.palette.text.primary,
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
  },
  '& .MuiIconButton-root': {
    color: theme.palette.text.secondary,
  }
}));

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoError = () => {
    setLogoError(true);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          {!logoError && logoPath ? (
            <img
              src={logoPath}
              alt="ATLAS Logo"
              style={{ width: '100%', maxWidth: '100%', marginBottom: '16px' }}
              onError={handleLogoError}
            />
          ) : (
            <Typography variant="h4" component="h1" align="center" gutterBottom fontWeight="bold">
              ATLAS
            </Typography>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <DarkTextField
            fullWidth
            label="Benutzername"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            sx={{ mb: 2 }}
          />
          <DarkTextField
            fullWidth
            label="Passwort"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Passwort anzeigen"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Link
            component={RouterLink}
            to="/request-password-reset"
            variant="body2"
            sx={{ display: 'block', mb: 2, textAlign: 'right' }}
          >
            Passwort vergessen?
          </Link>
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ height: 48 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Anmelden'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
