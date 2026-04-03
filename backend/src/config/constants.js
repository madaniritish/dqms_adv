module.exports = {
  SLOT_DURATION_MIN: parseInt(process.env.SLOT_DURATION_MIN) || 12,
  CLOSING_HOUR: parseInt(process.env.CLOSING_HOUR) || 17,
  CLOSING_MIN: parseInt(process.env.CLOSING_MIN) || 0,
  CUTOFF_MIN_BEFORE_CLOSE: parseInt(process.env.CUTOFF_MIN_BEFORE_CLOSE) || 30,
  CANCEL_CUTOFF_MIN: parseInt(process.env.CANCEL_CUTOFF_MIN) || 15,
  MOVE_SLOT_CUTOFF_MIN: parseInt(process.env.MOVE_SLOT_CUTOFF_MIN) || 30,
  MAX_SLOT_CHANGES: parseInt(process.env.MAX_SLOT_CHANGES) || 2,
  NOSHOW_WAIT_MIN: parseInt(process.env.NOSHOW_WAIT_MIN) || 5,
  MAX_FAILED_LOGINS: 5,
  LOCK_DURATION_MIN: 30,
  SESSION_TIMEOUT_SEC: parseInt(process.env.SESSION_TIMEOUT) || 1800,
  QUEUE_START_HOUR: 9,
  QUEUE_START_MIN: 0,
  // Clinic timezone used for interpreting stored {date: YYYY-MM-DD, timeSlot: HH:MM}.
  // NIT Warangal -> Asia/Kolkata -> UTC+5:30 => 330 minutes.
  CLINIC_TZ_OFFSET_MIN: parseInt(process.env.CLINIC_TZ_OFFSET_MIN) || 330,

  NOTIFICATION_TYPES: {
    SECOND_NEXT: 'Second-Next',
    NEXT: 'Next',
    CANCELLED: 'Cancelled',
    EMERGENCY: 'Emergency',
  },

  APPOINTMENT_STATUS: {
    WAITING: 'Waiting',
    SECOND_NEXT: 'Second-Next',
    NEXT: 'Next',
    IN_CONSULTATION: 'InConsultation',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'NoShow',
    RESCHEDULED: 'Rescheduled',
    EMERGENCY_SHIFT: 'EmergencyShift',
  },

  ROLES: {
    STUDENT: 'student',
    STAFF: 'staff',
    DOCTOR: 'doctor',
  },

  SOCKET_EVENTS: {
    QUEUE_UPDATE: 'queue:update',
    NOTIFICATION_NEXT: 'notification:next',
    NOTIFICATION_SECOND: 'notification:second',
    NOTIFICATION_EMERGENCY: 'notification:emergency',
    QUEUE_EMPTY: 'queue:empty',
  },
};
