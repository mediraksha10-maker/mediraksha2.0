import React from 'react'
import { generateTimeSlots } from '../utils/dateUtils'

type Props = { selected: string[]; onToggle: (time: string) => void }

const TimeSlotGrid: React.FC<Props> = ({ selected, onToggle }) => {
  const slots = generateTimeSlots()
  return (
    <div className="time-slot-grid-wrapper">
      <p className="time-grid-label">Pick Available Times:</p>
      <div className="time-slot-grid">
        {slots.map(({ time, endTime }) => (
          <button
            key={time}
            className={`time-slot-btn${selected.includes(time) ? ' time-slot-selected' : ''}`}
            onClick={() => onToggle(time)}
            aria-pressed={selected.includes(time)}
            id={`timeslot-${time.replace(':', '')}`}
          >
            {time} – {endTime}
          </button>
        ))}
      </div>
    </div>
  )
}

export default TimeSlotGrid
