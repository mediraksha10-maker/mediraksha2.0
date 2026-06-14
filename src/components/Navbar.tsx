import React from 'react'

type Props = { doctorName?: string }

const Navbar: React.FC<Props> = ({ doctorName = 'Dr. Ananya Sharma' }) => (
  <nav className="navbar">
    <div className="navbar-inner">
      {/* <div className="navbar-brand">
        <div className="brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" fill="currentColor"/>
          </svg>
        </div>
        <span className="brand-name">MediSlots</span>
      </div> */}
      <div className="navbar-left">
        <span className="navbar-title">Manage Availability</span>
      </div>
      {/* <div className="navbar-right">
        <div className="doctor-avatar">
          <span>{doctorName.charAt(3).toUpperCase()}</span>
        </div>
        <div className="doctor-info">
          <span className="doctor-name">{doctorName}</span>
          <span className="doctor-role">Provider</span>
        </div>
      </div> */}
    </div>
  </nav>
)

export default Navbar
