import {
  getMailSender,
  getMailSettings,
  getMailTransporter,
} from '../config/mail.js';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
};

const formatMoney = (value) => `$${Number(value).toFixed(2)}`;
const sanitizeHeader = (value) => String(value).replace(/[\r\n]+/g, ' ');

const resolveMailDelivery = (logicalRecipient) => {
  const { testRecipient } = getMailSettings();
  const overridden = (
    process.env.NODE_ENV !== 'production' && Boolean(testRecipient)
  );

  return {
    logicalRecipient,
    deliveryRecipient: overridden ? testRecipient : logicalRecipient,
    overridden,
  };
};

const createTemplate = ({
  title,
  greeting,
  intro,
  details = [],
  items = [],
  itemHeading = 'Tickets',
  note,
}) => {
  const textDetails = details.map(
    ({ label, value }) => `${label}: ${value}`,
  );
  const textItems = items.length > 0
    ? ['', `${itemHeading}:`, ...items.map((item) => `- ${item}`)]
    : [];
  const htmlDetails = details.map(({ label, value }) => `
    <tr>
      <td style="padding: 6px 12px 6px 0; color: #5f6368; vertical-align: top;">${escapeHtml(label)}</td>
      <td style="padding: 6px 0; color: #202124; font-weight: 600;">${escapeHtml(value)}</td>
    </tr>`).join('');
  const htmlItems = items.length > 0
    ? `<h2 style="font-size: 16px; margin: 24px 0 8px; color: #202124;">${escapeHtml(itemHeading)}</h2>
       <ul style="margin: 0; padding-left: 20px; color: #202124;">
         ${items.map((item) => `<li style="margin: 6px 0;">${escapeHtml(item)}</li>`).join('')}
       </ul>`
    : '';

  return {
    text: [
      'Tickety',
      '',
      title,
      greeting,
      intro,
      '',
      ...textDetails,
      ...textItems,
      '',
      note,
      '',
      'This is an automated message from Tickety.',
    ].filter((line) => line !== undefined).join('\n'),
    html: `<!doctype html>
      <html>
        <body style="margin: 0; padding: 24px; background: #f4f6f8; font-family: Arial, sans-serif;">
          <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #dde2e7; border-radius: 10px; overflow: hidden;">
            <div style="padding: 20px 28px; background: #172554; color: #ffffff; font-size: 24px; font-weight: 700;">Tickety</div>
            <div style="padding: 28px;">
              <h1 style="margin: 0 0 18px; color: #172554; font-size: 24px;">${escapeHtml(title)}</h1>
              <p style="margin: 0 0 10px; color: #202124; line-height: 1.6;">${escapeHtml(greeting)}</p>
              <p style="margin: 0 0 20px; color: #202124; line-height: 1.6;">${escapeHtml(intro)}</p>
              <table role="presentation" style="border-collapse: collapse; width: 100%;">${htmlDetails}</table>
              ${htmlItems}
              <p style="margin: 24px 0 0; padding: 14px; background: #eef2ff; color: #312e81; border-radius: 6px; line-height: 1.5;">${escapeHtml(note)}</p>
            </div>
            <div style="padding: 16px 28px; background: #f8fafc; color: #64748b; font-size: 12px;">This is an automated message from Tickety.</div>
          </div>
        </body>
      </html>`,
  };
};

const sendMessage = async ({ to, subject, template }) => {
  const mailTransporter = getMailTransporter();

  if (!mailTransporter) {
    return { sent: false, skipped: true };
  }

  const delivery = resolveMailDelivery(to);
  const safeLogicalRecipient = sanitizeHeader(delivery.logicalRecipient);
  const deliverySubject = delivery.overridden
    ? `[DEV → ${safeLogicalRecipient}] ${subject}`
    : subject;

  const result = await mailTransporter.sendMail({
    from: getMailSender(),
    to: delivery.deliveryRecipient,
    subject: sanitizeHeader(deliverySubject),
    text: template.text,
    html: template.html,
    ...(delivery.overridden && {
      headers: {
        'X-Tickety-Original-Recipient': safeLogicalRecipient,
      },
    }),
  });

  return {
    sent: true,
    skipped: false,
    messageId: result.messageId,
    ...delivery,
  };
};

const sendSafely = async (failureMessage, send) => {
  try {
    return await send();
  } catch {
    console.warn(failureMessage);
    return { sent: false, skipped: false, failed: true };
  }
};

const sendBookingConfirmation = async (booking) => sendSafely(
  `Booking confirmation email failed for booking ${booking.id}`,
  () => sendMessage({
    to: booking.customer.email,
    subject: `Tickety — Booking Confirmed: ${booking.event.title}`,
    template: createTemplate({
      title: 'Booking confirmed',
      greeting: `Hello ${booking.customer.firstName},`,
      intro: 'Your booking has been confirmed.',
      details: [
        { label: 'Event', value: booking.event.title },
        { label: 'Date and time', value: formatDate(booking.event.eventDate) },
        { label: 'Location', value: booking.event.location },
        { label: 'Booking ID', value: booking.id },
        { label: 'Total', value: formatMoney(booking.total) },
        { label: 'Status', value: booking.status },
      ],
      items: booking.items.map((item) => (
        `${item.name} — ${item.quantity} × ${formatMoney(item.price)} = ${formatMoney(item.quantity * item.price)}`
      )),
      note: 'Keep this message for your booking records.',
    }),
  }),
);

const sendBookingCancellation = async (booking) => sendSafely(
  `Booking cancellation email failed for booking ${booking.id}`,
  () => sendMessage({
    to: booking.customer.email,
    subject: `Tickety — Booking Cancelled: ${booking.event.title}`,
    template: createTemplate({
      title: 'Booking cancelled',
      greeting: `Hello ${booking.customer.firstName},`,
      intro: 'Your booking has been cancelled.',
      details: [
        { label: 'Event', value: booking.event.title },
        { label: 'Booking ID', value: booking.id },
        { label: 'Status', value: booking.status },
      ],
      items: booking.items.map((item) => (
        `${item.name} — ${item.quantity} ticket${item.quantity === 1 ? '' : 's'} cancelled`
      )),
      note: 'No further action is required for this cancellation.',
    }),
  }),
);

const sendEventApproved = async (event) => sendSafely(
  `Event approval email failed for event ${event.id}`,
  () => sendMessage({
    to: event.organizerEmail,
    subject: `Tickety — Event Approved: ${event.title}`,
    template: createTemplate({
      title: 'Event approved',
      greeting: `Hello ${event.organizerFirstName},`,
      intro: `Your Event “${event.title}” has been approved by the Tickety Owner.`,
      details: [
        { label: 'Event', value: event.title },
        { label: 'Approval status', value: event.approvalStatus },
        { label: 'Event status', value: event.status },
      ],
      note: 'The Event is publicly discoverable only when its status is active and its approval status is approved.',
    }),
  }),
);

const sendEventRejected = async (event) => sendSafely(
  `Event rejection email failed for event ${event.id}`,
  () => sendMessage({
    to: event.organizerEmail,
    subject: `Tickety — Event Requires Changes: ${event.title}`,
    template: createTemplate({
      title: 'Event requires changes',
      greeting: `Hello ${event.organizerFirstName},`,
      intro: `Your Event “${event.title}” was not approved in its current form.`,
      details: [
        { label: 'Event', value: event.title },
        { label: 'Owner reason', value: event.rejectionReason },
      ],
      note: 'Editing and saving the Event moves it back to pending approval.',
    }),
  }),
);

const sendOrganizerWelcome = async (organizer) => sendSafely(
  `Organizer welcome email failed for user ${organizer.id}`,
  () => sendMessage({
    to: organizer.email,
    subject: 'Welcome to Tickety Organizer',
    template: createTemplate({
      title: 'Welcome to Tickety Organizer',
      greeting: `Hello ${organizer.firstName},`,
      intro: 'Your Tickety Organizer account has been created.',
      details: [
        { label: 'Account email', value: organizer.email },
      ],
      items: [
        'Create and manage Events',
        'Manage Ticket Types and inventory',
        'Submit Events for Owner approval',
      ],
      itemHeading: 'Organizer capabilities',
      note: 'Sign in with the account details provided to you securely by the Tickety Owner.',
    }),
  }),
);

const sendSmtpTest = async (recipient) => sendMessage({
  to: recipient,
  subject: 'Tickety SMTP Test',
  template: createTemplate({
    title: 'SMTP test successful',
    greeting: 'Hello,',
    intro: 'Tickety successfully sent this message using the configured SMTP server.',
    note: 'The Tickety email configuration is ready for application notifications.',
  }),
});

export {
  resolveMailDelivery,
  sendBookingCancellation,
  sendBookingConfirmation,
  sendEventApproved,
  sendEventRejected,
  sendOrganizerWelcome,
  sendSmtpTest,
};
