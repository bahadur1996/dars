import { createTheme } from '@mui/material/styles'

// Palette: plate green (Bangladeshi commercial number plates), signal red, slate ink, cool paper.
export const colors = {
  plate: '#0E6B4E',
  plateDark: '#0A4F3A',
  signal: '#C8372D',
  ink: '#22303A',
  muted: '#5B6B73',
  paper: '#F4F6F5',
  rule: '#D9DFDC',
  white: '#FFFFFF',
}

export const fonts = {
  display: '"Barlow Condensed", "Arial Narrow", sans-serif',
  body: '"IBM Plex Sans", "Noto Sans Bengali", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
}

export const theme = createTheme({
  palette: {
    primary: { main: colors.plate, dark: colors.plateDark, contrastText: colors.white },
    error: { main: colors.signal },
    text: { primary: colors.ink, secondary: colors.muted },
    background: { default: colors.paper, paper: colors.white },
    divider: colors.rule,
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: fonts.body,
    h1: { fontFamily: fonts.display, fontWeight: 700, fontSize: '2.25rem', letterSpacing: '0.01em' },
    h2: { fontFamily: fonts.display, fontWeight: 700, fontSize: '1.75rem' },
    h3: { fontFamily: fonts.display, fontWeight: 600, fontSize: '1.35rem', letterSpacing: '0.02em' },
    h4: { fontFamily: fonts.display, fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: `1px solid ${colors.rule}` } } },
    MuiAppBar: { styleOverrides: { root: { border: 'none' } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: colors.muted, fontSize: '0.8rem' } } },
  },
})
