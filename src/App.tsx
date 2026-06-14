import React from 'react'
import Navbar from './components/Navbar'
import StatsCard from './components/StatsCard'
import SlotDateGroup from './components/SlotDateGroup'
import PublishSlots from './components/PublishSlots'
import ToastContainer from './components/ToastContainer'
import { useSlots } from './hooks/useSlots'

const App: React.FC = () => {
  const { groupedSlots, availableCount, bookedCount, removeSlot, publishSlots, toasts, removeToast } = useSlots()

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-title">Manage Availability</h1>
            <p className="page-subtitle">Publish and manage your appointment slots</p>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Left column */}
          <div className="left-column">
            <StatsCard available={availableCount} booked={bookedCount} />

            <div className="current-availability card">
              <div className="section-header">
                <h2 className="section-title">Current Availability</h2>
                {groupedSlots.length > 0 && (
                  <span className="section-badge">{groupedSlots.length} date{groupedSlots.length !== 1 ? 's' : ''}</span>
                )}
              </div>

              {groupedSlots.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" fill="currentColor"/>
                    </svg>
                  </div>
                  <p className="empty-title">No slots published yet</p>
                  <p className="empty-subtitle">Use the Publish Slots panel to add your availability.</p>
                </div>
              ) : (
                <div className="slot-groups">
                  {groupedSlots.map(group => (
                    <SlotDateGroup key={group.date} group={group} onRemove={removeSlot} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="right-column">
            <PublishSlots onPublish={publishSlots} />
          </div>
        </div>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

export default App
