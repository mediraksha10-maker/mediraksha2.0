import React from 'react'

type Props = { available: number; booked: number }

const StatsCard: React.FC<Props> = ({ available, booked }) => (
  <div className="stats-card card">
    <h2 className="section-title">Current Availability</h2>
    <div className="stats-grid">
      <div className="stat-item stat-available">
        <div className="stat-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-number">{available}</span>
          <span className="stat-label">Available</span>
        </div>
      </div>
      <div className="stat-item stat-booked">
        <div className="stat-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" fill="currentColor"/>
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-number stat-number-booked">{booked}</span>
          <span className="stat-label">Booked</span>
        </div>
      </div>
    </div>
  </div>
)

export default StatsCard
