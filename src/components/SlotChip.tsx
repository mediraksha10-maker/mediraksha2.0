import React from 'react'
import type { TimeSlot } from '../types/index'

type Props = { slot: TimeSlot; onRemove: (id: string) => void }

const SlotChip: React.FC<Props> = ({ slot, onRemove }) => (
  <div className={`slot-chip${slot.status === 'booked' ? ' slot-chip-booked' : ''}`}>
    <span className="slot-chip-time">{slot.time}</span>
    {slot.status !== 'booked' && (
      <button className="slot-chip-remove" onClick={() => onRemove(slot.id)} aria-label={`Remove ${slot.time}`}>
        ×
      </button>
    )}
  </div>
)

export default SlotChip
