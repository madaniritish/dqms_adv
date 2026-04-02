const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"NITW Healthcare" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('📧 Email send failed:', err.message);
    return false;
  }
};

const logNotification = async ({ studentId, appointmentId, message, channel, type, metadata }) => {
  try {
    await Notification.create({ studentId, appointmentId, message, channel, type, metadata });
  } catch (err) {
    console.error('📦 Notification log failed:', err.message);
  }
};

const sendConfirmationEmail = async (student, appointment, doctor) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background: #1e3a5f; padding: 16px; border-radius: 6px 6px 0 0;">
        <h2 style="color: white; margin: 0;">NITW Healthcare Center</h2>
        <p style="color: #a0c4ff; margin: 4px 0 0;">Queue Booking Confirmation</p>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>Your appointment has been <strong style="color: #16a34a;">confirmed</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; background: #f8fafc; font-weight: bold;">Doctor</td>
              <td style="padding: 8px;">${doctor.name} (${doctor.specialization})</td></tr>
          <tr><td style="padding: 8px; background: #f8fafc; font-weight: bold;">Date</td>
              <td style="padding: 8px;">${appointment.date}</td></tr>
          <tr><td style="padding: 8px; background: #f8fafc; font-weight: bold;">Time Slot</td>
              <td style="padding: 8px;">${appointment.timeSlot}</td></tr>
          <tr><td style="padding: 8px; background: #f8fafc; font-weight: bold;">Queue Position</td>
              <td style="padding: 8px;">#${appointment.queuePosition}</td></tr>
          <tr><td style="padding: 8px; background: #f8fafc; font-weight: bold;">Est. Wait</td>
              <td style="padding: 8px;">~${(appointment.queuePosition - 1) * 12} minutes</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 14px;">You will receive real-time updates as the queue progresses. Please arrive 5 minutes before your estimated time.</p>
        <p style="color: #6b7280; font-size: 14px;">Visit <a href="${process.env.CLIENT_URL}">DQMS Portal</a> to view your queue status.</p>
      </div>
      <div style="background: #f8fafc; padding: 12px; border-radius: 0 0 6px 6px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">NIT Warangal Healthcare Center | Do not reply to this email</p>
      </div>
    </div>`;

  const sent = await sendEmail({ to: student.email, subject: '✅ Queue Confirmed - NITW Healthcare', html });
  if (sent) {
    await logNotification({
      studentId: student._id,
      appointmentId: appointment._id,
      message: `Queue booking confirmed for ${appointment.date} at ${appointment.timeSlot}`,
      channel: 'email',
      type: 'Confirmation',
    });
  }
};

const sendSecondNextEmail = async (student, appointment) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #fde68a; border-radius: 8px;">
      <div style="background: #d97706; padding: 16px; border-radius: 6px 6px 0 0;">
        <h2 style="color: white; margin: 0;">⚠️ You're Second in Line!</h2>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>You are now <strong>second in the queue</strong> for your appointment on <strong>${appointment.date}</strong> at <strong>${appointment.timeSlot}</strong>.</p>
        <p style="background: #fffbeb; padding: 12px; border-left: 4px solid #d97706; border-radius: 4px;">
          🕐 <strong>Please start heading to the Healthcare Center now.</strong>
        </p>
      </div>
    </div>`;

  const sent = await sendEmail({ to: student.email, subject: '⚠️ Almost Your Turn - NITW Healthcare', html });
  if (sent) {
    await logNotification({
      studentId: student._id,
      appointmentId: appointment._id,
      message: 'You are second in queue. Please prepare to visit.',
      channel: 'email',
      type: 'Second-Next',
    });
  }
};

const sendNextEmail = async (student, appointment) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #86efac; border-radius: 8px;">
      <div style="background: #16a34a; padding: 16px; border-radius: 6px 6px 0 0;">
        <h2 style="color: white; margin: 0;">🟢 It's Your Turn!</h2>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>You are now <strong>NEXT</strong> in the queue. <strong>Please arrive at the Healthcare Center immediately.</strong></p>
        <p style="background: #f0fdf4; padding: 12px; border-left: 4px solid #16a34a; border-radius: 4px;">
          🏃 <strong>Report to the reception desk now.</strong>
        </p>
      </div>
    </div>`;

  const sent = await sendEmail({ to: student.email, subject: '🟢 It\'s Your Turn Now - NITW Healthcare', html });
  if (sent) {
    await logNotification({
      studentId: student._id,
      appointmentId: appointment._id,
      message: 'You are NEXT. Arrive at Healthcare Center immediately.',
      channel: 'email',
      type: 'Next',
    });
  }
};

const sendCancellationEmail = async (student, appointment) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #fca5a5; border-radius: 8px;">
      <div style="background: #dc2626; padding: 16px; border-radius: 6px 6px 0 0;">
        <h2 style="color: white; margin: 0;">❌ Appointment Cancelled</h2>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>Your appointment on <strong>${appointment.date}</strong> at <strong>${appointment.timeSlot}</strong> has been <strong>cancelled</strong>.</p>
        <p>You can book a new appointment anytime by visiting the <a href="${process.env.CLIENT_URL}">DQMS Portal</a>.</p>
      </div>
    </div>`;

  const sent = await sendEmail({ to: student.email, subject: '❌ Appointment Cancelled - NITW Healthcare', html });
  if (sent) {
    await logNotification({
      studentId: student._id,
      appointmentId: appointment._id,
      message: `Appointment cancelled for ${appointment.date} at ${appointment.timeSlot}`,
      channel: 'email',
      type: 'Cancelled',
    });
  }
};

// Stub: SMS via REST API
const sendSMS = async (phone, message) => {
  if (!phone) return;
  console.log(`📱 SMS (stub) to ${phone}: ${message}`);
  // Integrate with Twilio/MSG91 here
};

module.exports = {
  sendConfirmationEmail,
  sendSecondNextEmail,
  sendNextEmail,
  sendCancellationEmail,
  sendSMS,
  logNotification,
};
