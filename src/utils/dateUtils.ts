import type { TimeSlot } from '../types/index'

export const formatDateLabel = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export const toISODate = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const addMinutes = (time: string, minutes: number): string => {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const generateTimeSlots = (): Pick<TimeSlot, 'time' | 'endTime'>[] => {
  const slots: Pick<TimeSlot, 'time' | 'endTime'>[] = []
  const ranges = [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }]
  ranges.forEach(({ start, end }) => {
    let current = start
    while (current < end) {
      const next = addMinutes(current, 15)
      if (next <= end) slots.push({ time: current, endTime: next })
      current = next
    }
  })
  return slots
}

export const getWeekDaysForNext8Weeks = (weekDay: number): string[] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let diff = weekDay - today.getDay()
  if (diff <= 0) diff += 7
  const first = new Date(today)
  first.setDate(today.getDate() + diff)
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(first)
    d.setDate(first.getDate() + i * 7)
    return toISODate(d)
  })
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_FULL_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
