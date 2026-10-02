import { Box } from '@mui/material'
import { colors, fonts } from '../theme'

const SIZES = {
  sm: { font: '1rem', top: '0.5rem', px: 0.75, py: 0.25 },
  md: { font: '1.4rem', top: '0.6rem', px: 1.25, py: 0.4 },
  lg: { font: '2.6rem', top: '0.95rem', px: 2.5, py: 0.9 },
}

/**
 * A rickshaw number drawn as a Bangladeshi commercial number plate:
 * white letters on green, with an inset white rule and the city line on top.
 */
export function Plate({ number, size = 'md' }: { number: string; size?: keyof typeof SIZES }) {
  const s = SIZES[size]
  return (
    <Box
      component="span"
      aria-label={`Rickshaw number ${number}`}
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: colors.plate,
        color: colors.white,
        borderRadius: '4px',
        px: s.px,
        py: s.py,
        outline: `1.5px solid ${colors.white}`,
        outlineOffset: '-4px',
        boxShadow: `0 0 0 1px ${colors.plateDark}`,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {size !== 'sm' && (
        <Box component="span" aria-hidden sx={{ fontFamily: fonts.body, fontSize: s.top, opacity: 0.85, mb: 0.25 }}>
          ঢাকা · DHAKA
        </Box>
      )}
      <Box
        component="span"
        sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: s.font, letterSpacing: '0.08em' }}
      >
        {number}
      </Box>
    </Box>
  )
}
