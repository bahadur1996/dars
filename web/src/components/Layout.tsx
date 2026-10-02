import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined'
import ElectricRickshawOutlined from '@mui/icons-material/ElectricRickshawOutlined'
import BadgeOutlined from '@mui/icons-material/BadgeOutlined'
import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined'
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined'
import HistoryOutlined from '@mui/icons-material/HistoryOutlined'
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { setLanguage } from '../i18n'
import { colors, fonts } from '../theme'
import { ChangePasswordDialog } from './ChangePasswordDialog'

const DRAWER = 232

export function Layout() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [pwOpen, setPwOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const items = [
    { to: '/', label: t('nav.dashboard'), icon: <SpaceDashboardOutlined />, end: true },
    { to: '/rickshaws', label: t('nav.rickshaws'), icon: <ElectricRickshawOutlined /> },
    { to: '/drivers', label: t('nav.drivers'), icon: <BadgeOutlined /> },
    { to: '/owners', label: t('nav.owners'), icon: <HomeWorkOutlined /> },
    ...(user?.role === 'ADMIN'
      ? [
          { to: '/users', label: t('nav.users'), icon: <ManageAccountsOutlined /> },
          { to: '/audit', label: t('nav.audit'), icon: <HistoryOutlined /> },
        ]
      : []),
  ]

  const nav = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: colors.ink, color: '#E6ECE9' }}>
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.6rem', letterSpacing: '0.12em', lineHeight: 1 }}>
          DARS
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          {t('appName')}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {items.map((it) => {
          const active = it.end ? location.pathname === it.to : location.pathname.startsWith(it.to)
          return (
            <ListItemButton
              key={it.to}
              component={NavLink}
              to={it.to}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 1,
                mb: 0.25,
                color: 'inherit',
                borderLeft: '3px solid transparent',
                ...(active && { bgcolor: 'rgba(255,255,255,0.08)', borderLeftColor: colors.plate, color: '#fff' }),
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36, opacity: active ? 1 : 0.7 }}>{it.icon}</ListItemIcon>
              <ListItemText primary={it.label} slotProps={{ primary: { sx: { fontSize: '0.92rem', fontWeight: active ? 600 : 400 } } }} />
            </ListItemButton>
          )
        })}
      </List>
      <Box sx={{ p: 2 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={i18n.language}
          onChange={(_, v: 'en' | 'bn' | null) => v && setLanguage(v)}
          aria-label="Language"
          sx={{ '& .MuiToggleButton-root': { color: '#C9D3CF', borderColor: 'rgba(255,255,255,0.15)', px: 1.5 }, '& .Mui-selected': { color: '#fff !important', bgcolor: 'rgba(255,255,255,0.12) !important' } }}
        >
          <ToggleButton value="en">English</ToggleButton>
          <ToggleButton value="bn">বাংলা</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {desktop ? (
        <Drawer variant="permanent" sx={{ width: DRAWER, '& .MuiDrawer-paper': { width: DRAWER, border: 'none' } }}>
          {nav}
        </Drawer>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ '& .MuiDrawer-paper': { width: DRAWER } }}>
          {nav}
        </Drawer>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky" color="inherit" sx={{ bgcolor: 'rgba(244,246,245,0.92)', backdropFilter: 'blur(6px)', borderBottom: `1px solid ${colors.rule}` }}>
          <Toolbar sx={{ gap: 1 }}>
            {!desktop && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }} />
            <Button variant="contained" onClick={() => navigate('/rickshaws/new')}>
              {t('action.registerRickshaw')}
            </Button>
            <Button
              color="inherit"
              startIcon={<AccountCircleOutlined />}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              {user?.fullName}
            </Button>
            <IconButton sx={{ display: { sm: 'none' } }} onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Account">
              <AccountCircleOutlined />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
              <MenuItem disabled>
                <Typography variant="body2">
                  {user?.username} · {user?.role === 'ADMIN' ? 'Admin' : 'Officer'}
                </Typography>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null)
                  setPwOpen(true)
                }}
              >
                {t('action.changePassword')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null)
                  void logout()
                }}
              >
                {t('action.signOut')}
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 }, maxWidth: 1240, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </Box>
  )
}
