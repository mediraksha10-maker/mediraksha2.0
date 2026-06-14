import React, { useState } from 'react'
import type { PublishMode } from '../types/index'
import TimeSlotGrid from './TimeSlotGrid'
import {
  toISODate,
  getWeekDaysForNext8Weeks,
  generateTimeSlots,
  DAY_NAMES,
  DAY_FULL_NAMES,
} from '../utils/dateUtils'

type SlotPayload = { date: string; time: string; endTime: string }
type Props = { onPublish: (slots: SlotPayload[]) => void }

const PublishSlots: React.FC<Props> = ({ onPublish }) => {
  const [mode, setMode] = useState<PublishMode>('single')
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()))
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([])
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])

  const allSlots = generateTimeSlots()

  const toggleTime = (time: string) =>
    setSelectedTimes(prev => prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time])

  const toggleWeekDay = (day: number) =>
    setSelectedWeekDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const handleSelectAll = () =>
    setSelectedTimes(selectedTimes.length === allSlots.length ? [] : allSlots.map(s => s.time))

  const handlePublish = () => {
    if (selectedTimes.length === 0) return
    const result: SlotPayload[] = []
    if (mode === 'single') {
      selectedTimes.forEach(time => {
        const slot = allSlots.find(s => s.time === time)
        if (slot) result.push({ date: selectedDate, time, endTime: slot.endTime })
      })
    } else {
      selectedWeekDays.forEach(day => {
        getWeekDaysForNext8Weeks(day).forEach(date => {
          selectedTimes.forEach(time => {
            const slot = allSlots.find(s => s.time === time)
            if (slot) result.push({ date, time, endTime: slot.endTime })
          })
        })
      })
    }
    onPublish(result)
    setSelectedTimes([])
    if (mode === 'weekly') setSelectedWeekDays([])
  }

  const canPublish = selectedTimes.length > 0 && (mode === 'single' || selectedWeekDays.length > 0)

  return (
    <div className="publish-slots card">
      <h2 className="section-title">Publish Slots</h2>

      {/* Mode Toggle */}
      <div className="mode-toggle" role="tablist">
        <button
          role="tab" aria-selected={mode === 'single'} id="mode-single"
          className={`mode-btn${mode === 'single' ? ' mode-btn-active' : ''}`}
          onClick={() => setMode('single')}
        >Single Day</button>
        <button
          role="tab" aria-selected={mode === 'weekly'} id="mode-weekly"
          className={`mode-btn${mode === 'weekly' ? ' mode-btn-active' : ''}`}
          onClick={() => setMode('weekly')}
        >Weekly Repeat</button>
      </div>

      {/* Date / Day Selection */}
      {mode === 'single' ? (
        <div className="date-picker-wrapper">
          <label className="input-label" htmlFor="date-picker">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" fill="currentColor"/>
            </svg>
            Select Date
          </label>
          <input
            id="date-picker" type="date" className="date-input"
            value={selectedDate} min={toISODate(new Date())}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      ) : (
        <div className="weekday-picker">
          <label className="input-label">Select Days of the Week</label>
          <div className="weekday-chips">
            {DAY_NAMES.map((name, idx) => (
              <button
                key={idx} id={`weekday-${name}`}
                className={`weekday-chip${selectedWeekDays.includes(idx) ? ' weekday-chip-active' : ''}`}
                onClick={() => toggleWeekDay(idx)}
              >{name}</button>
            ))}
          </div>
          {selectedWeekDays.length > 0 && (
            <p className="weekday-preview">
              Repeating every {selectedWeekDays.map(d => DAY_FULL_NAMES[d]).join(', ')} for 8 weeks
            </p>
          )}
        </div>
      )}

      {/* Time Grid */}
      <TimeSlotGrid selected={selectedTimes} onToggle={toggleTime} />

      {/* Footer */}
      <div className="publish-footer">
        <button className="select-all-btn" onClick={handleSelectAll} id="btn-select-all">
          {selectedTimes.length === allSlots.length ? 'Deselect All' : 'Select All'}
        </button>
        <div className="publish-footer-right">
          {selectedTimes.length > 0 && (
            <span className="selected-count">{selectedTimes.length} selected</span>
          )}
          <button
            className={`publish-btn${canPublish ? ' publish-btn-active' : ' publish-btn-disabled'}`}
            onClick={handlePublish} disabled={!canPublish} id="btn-publish"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
            </svg>
            Publish Slots
          </button>
        </div>
      </div>
    </div>
  )
}

export default PublishSlots
