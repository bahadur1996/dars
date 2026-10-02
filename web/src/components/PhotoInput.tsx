import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import { useEffect, useRef, useState } from 'react'
import { apiError } from '../api/client'
import { photoApi } from '../api/endpoints'
import { resizeImage } from '../lib/resizeImage'
import { colors } from '../theme'
import { AuthImage } from './AuthImage'

interface Props {
  label: string
  hint?: string
  value: string | null
  onChange: (photoId: string | null) => void
  error?: string
  required?: boolean
}

/** Take a photo with the webcam or pick a file; the image is resized, uploaded, and its id returned. */
export function PhotoInput({ label, hint, value, onChange, error, required }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  async function upload(source: Blob | HTMLVideoElement) {
    setBusy(true)
    setUploadError(null)
    try {
      const blob = await resizeImage(source)
      onChange(await photoApi.upload(blob))
    } catch (e) {
      setUploadError(e instanceof Error && !('isAxiosError' in e) ? 'That file is not a readable image. Use a JPEG or PNG.' : apiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  const message = uploadError ?? error
  return (
    <Box>
      <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
        {label}
        {required && <Box component="span" sx={{ color: colors.signal }}> *</Box>}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box sx={{ position: 'relative' }}>
          <AuthImage id={value} alt={label} size={112} ratio={3 / 4} />
          {busy && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.7)' }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </Box>
        <Stack spacing={1} sx={{ alignItems: 'flex-start', '& .MuiButton-root': { whiteSpace: 'nowrap' } }}>
          <Button variant="outlined" size="small" startIcon={<PhotoCameraOutlined />} onClick={() => setCameraOpen(true)} disabled={busy}>
            {value ? 'Retake photo' : 'Take photo'}
          </Button>
          <Button variant="text" size="small" startIcon={<UploadFileOutlined />} onClick={() => fileRef.current?.click()} disabled={busy}>
            Upload a file
          </Button>
          {value && !required && (
            <Button variant="text" size="small" color="inherit" onClick={() => onChange(null)} disabled={busy}>
              Remove
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void upload(f)
            }}
          />
        </Stack>
      </Stack>
      {(message || hint) && (
        <Typography variant="caption" color={message ? 'error' : 'text.secondary'} sx={{ display: 'block', mt: 0.75 }}>
          {message ?? hint}
        </Typography>
      )}
      <CameraDialog
        open={cameraOpen}
        title={label}
        onClose={() => setCameraOpen(false)}
        onCapture={(video) => {
          void upload(video).then(() => setCameraOpen(false))
        }}
      />
    </Box>
  )
}

function CameraDialog({ open, title, onClose, onCapture }: { open: boolean; title: string; onClose: () => void; onCapture: (v: HTMLVideoElement) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!open) return
    let stream: MediaStream | null = null
    let cancelled = false
    setError(null)
    setReady(false)
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1600 } } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          void videoRef.current.play()
        }
      })
      .catch(() => setError('No camera is available, or camera access was blocked. Use "Upload a file" instead.'))
    if (!navigator.mediaDevices) setError('This browser cannot use the camera. Use "Upload a file" instead.')
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Box
            component="video"
            ref={videoRef}
            muted
            playsInline
            onLoadedData={() => setReady(true)}
            sx={{ width: '100%', borderRadius: 1, bgcolor: colors.ink, aspectRatio: '4 / 3' }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!!error || !ready} onClick={() => videoRef.current && onCapture(videoRef.current)}>
          Capture
        </Button>
      </DialogActions>
    </Dialog>
  )
}
