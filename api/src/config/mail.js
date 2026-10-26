import nodemailer from 'nodemailer';
import './environment.js';

let transporter;
let testTransporter = null;

const readBoolean = (value) => value?.trim().toLowerCase() === 'true';

const getMailSettings = () => ({
  enabled: readBoolean(process.env.SMTP_ENABLED),
  enabledValue: process.env.SMTP_ENABLED?.trim().toLowerCase() || 'false',
  host: process.env.SMTP_HOST?.trim() || '',
  port: Number(process.env.SMTP_PORT),
  portValue: process.env.SMTP_PORT?.trim() || '',
  secure: readBoolean(process.env.SMTP_SECURE),
  secureValue: process.env.SMTP_SECURE?.trim().toLowerCase() || '',
  user: process.env.SMTP_USER?.trim() || '',
  password: process.env.SMTP_PASSWORD || '',
  fromName: process.env.SMTP_FROM_NAME?.trim() || 'Tickety',
  fromEmail: process.env.SMTP_FROM_EMAIL?.trim() || '',
  testRecipient: process.env.SMTP_TEST_RECIPIENT?.trim() || '',
});

const getMailConfigurationIssues = (settings = getMailSettings()) => {
  const issues = [];

  if (!['true', 'false'].includes(settings.enabledValue)) {
    issues.push('SMTP_ENABLED must be true or false');
  }

  if (!settings.enabled) {
    return issues;
  }

  if (!settings.host) issues.push('SMTP_HOST is required');
  if (!settings.portValue) {
    issues.push('SMTP_PORT is required');
  } else if (!Number.isInteger(settings.port) || settings.port <= 0) {
    issues.push('SMTP_PORT must be a positive integer');
  }
  if (!['true', 'false'].includes(settings.secureValue)) {
    issues.push('SMTP_SECURE must be true or false');
  }
  if (!settings.user) issues.push('SMTP_USER is required');
  if (!settings.password) issues.push('SMTP_PASSWORD is required');
  if (!settings.fromEmail) issues.push('SMTP_FROM_EMAIL is required');

  return issues;
};

const getMailConfigurationWarning = () => {
  const settings = getMailSettings();
  const issues = getMailConfigurationIssues(settings);
  const warnings = [];

  if (issues.length > 0) {
    warnings.push(`SMTP email is unavailable: ${issues.join('; ')}`);
  }

  if (process.env.NODE_ENV === 'production' && settings.testRecipient) {
    warnings.push('SMTP_TEST_RECIPIENT is ignored in production');
  }

  return warnings.length > 0 ? warnings.join('. ') : null;
};

const getMailTransporter = () => {
  // Automated tests may inject an in-memory transport, but never create a
  // network-capable Nodemailer transport.
  if (process.env.NODE_ENV === 'test') {
    return testTransporter;
  }

  const settings = getMailSettings();

  if (!settings.enabled) {
    return null;
  }

  const issues = getMailConfigurationIssues(settings);

  if (issues.length > 0) {
    throw new Error(`SMTP configuration is incomplete: ${issues.join('; ')}`);
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.user,
        pass: settings.password,
      },
    });
  }

  return transporter;
};

const getMailSender = () => {
  const settings = getMailSettings();

  return {
    name: settings.fromName,
    address: settings.fromEmail,
  };
};

const setMailTransporterForTests = (nextTransporter) => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test mail transport can only be set in NODE_ENV=test');
  }

  testTransporter = nextTransporter;
};

export {
  getMailConfigurationIssues,
  getMailConfigurationWarning,
  getMailSender,
  getMailSettings,
  getMailTransporter,
  setMailTransporterForTests,
};
