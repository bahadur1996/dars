import { Box, Skeleton } from '@mui/material'
import ImageNotSupportedOutlined from '@mui/icons-material/ImageNotSupportedOutlined'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { photoApi } from '../api/endpoints'
import { colors } from '../theme'

/** Photos require a bearer token, so they are fetched as blobs rather than via <img src>. */
export function AuthImage({ id, alt, size = 96, ratio = 1 }: { id: string | null; alt: string; size?: number | string; ratio?: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['photo', id],
    queryFn: () => photoApi.blob(id!),
    enabled: !!id,
    staleTime: Infinity,
  })
  // Create and revoke the object URL in the same effect so a re-run (StrictMode, remount)
  // never leaves the <img> pointing at a revoked URL.
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!data) return
    const u = URL.createObjectURL(data)
    setUrl(u)
    return () => {
      URL.revokeObjectURL(u)
      setUrl(null)
    }
  }, [data])

  const box = { width: size, aspectRatio: String(ratio), borderRadius: 1, flexShrink: 0 }
  if (id && isLoading) return <Skeleton variant="rectangular" sx={box} />
  if (!id || isError || !url) {
    return (
      <Box sx={{ ...box, display: 'grid', placeItems: 'center', bgcolor: colors.paper, color: colors.muted, border: `1px dashed ${colors.rule}` }}>
        <ImageNotSupportedOutlined fontSize="small" titleAccess={id ? 'Photo could not be loaded' : 'No photo'} />
      </Box>
    )
  }
  return <Box component="img" src={url} alt={alt} sx={{ ...box, objectFit: 'cover', display: 'block' }} />
}
