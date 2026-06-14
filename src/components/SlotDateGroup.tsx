import React from 'react'
import type { SlotGroup } from '../types/index'
import SlotChip from './SlotChip'

type Props = { group: SlotGroup; onRemove: (id: string) => void }

const SlotDateGroup: React.FC<Props> = ({ group, onRemove }) => (
  <div className="slot-date-group">
    <div className="slot-date-header">
      <div className="slot-date-dot" />
      <span className="slot-date-label">{group.label}</span>
      <span className="slot-date-count">{group.slots.length} slot{group.slots.length !== 1 ? 's' : ''}</span>
    </div>
    <div className="slot-chips-row">
      {group.slots.map(slot => (
        <SlotChip key={slot.id} slot={slot} onRemove={onRemove} />
      ))}
    </div>
  </div>
)

export default SlotDateGroup
