/**
 * Passes a newly registered driver back to the rickshaw registration screen that is still on the stack,
 * so photos and fields already entered there are kept.
 */
let pendingDriverId: number | null = null

export const driverHandoff = {
  put(id: number) {
    pendingDriverId = id
  },
  take(): number | null {
    const id = pendingDriverId
    pendingDriverId = null
    return id
  },
}
