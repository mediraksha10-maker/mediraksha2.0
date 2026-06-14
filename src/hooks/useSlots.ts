import { useState, useCallback } from 'react'
import type { TimeSlot, SlotGroup, AppToast } from '../types/index'
import { formatDateLabel } from '../utils/dateUtils'

const generateMockSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const mockData: { date: string; times: string[] }[] = [
    { date: '2026-06-19', times: ['10:00', '10:15', '10:30', '11:00', '11:30', '12:00', '12:15'] },
    { date: '2026-06-23', times: ['10:00', '10:15', '10:30', '11:00', '11:15', '11:30', '12:00', '12:15'] },
    { date: '2026-06-26', times: ['10:00', '10:15', '10:30', '11:00', '11:15', '11:30', '12:00', '12:15'] },
  ]
  mockData.forEach(({ date, times }) => {
    times.forEach((time, i) => {
      const [h, m] = time.split(':').map(Number)
      const endM = m + 15
      const endH = endM >= 60 ? h + 1 : h
      const endMin = endM >= 60 ? endM - 60 : endM
      slots.push({
        id: `${date}-${time}`,
        date,
        time,
        endTime: `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
        status: i === 0 && date === '2026-06-19' ? 'booked' : 'available',
      })
    })
  })
  return slots
}

export const useSlots = () => {
  const [slots, setSlots] = useState<TimeSlot[]>(generateMockSlots)
  const [toasts, setToasts] = useState<AppToast[]>([])

  const addToast = useCallback((message: string, type: AppToast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const removeSlot = useCallback((slotId: string) => {
    setSlots(prev => prev.filter(s => s.id !== slotId))
    addToast('Slot removed successfully', 'info')
  }, [addToast])

  const publishSlots = useCallback((newSlots: Omit<TimeSlot, 'id' | 'status'>[]) => {
    const toAdd: TimeSlot[] = newSlots
      .filter(ns => !slots.some(s => s.date === ns.date && s.time === ns.time))
      .map(ns => ({ ...ns, id: `${ns.date}-${ns.time}`, status: 'available' as const }))
    if (toAdd.length === 0) {
      addToast('All selected slots already exist', 'error')
      return
    }
    setSlots(prev => [...prev, ...toAdd])
    addToast(`${toAdd.length} slot${toAdd.length > 1 ? 's' : ''} published!`, 'success')
  }, [slots, addToast])

  const groupedSlots: SlotGroup[] = (() => {
    const map = new Map<string, TimeSlot[]>()
    const sorted = [...slots].sort((a, b) =>
      a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)
    )
    sorted.forEach(s => {
      if (!map.has(s.date)) map.set(s.date, [])
      map.get(s.date)!.push(s)
    })
    return Array.from(map.entries()).map(([date, dateSlots]) => ({
      date,
      label: formatDateLabel(date),
      slots: dateSlots,
    }))
  })()

  const availableCount = slots.filter(s => s.status === 'available').length
  const bookedCount = slots.filter(s => s.status === 'booked').length

  return { groupedSlots, availableCount, bookedCount, removeSlot, publishSlots, toasts, removeToast }
}
