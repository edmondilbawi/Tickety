import {
  getMailConfigurationIssues,
  getMailSettings,
} from '../src/config/mail.js';
import { sendSmtpTest } from '../src/services/email.service.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getArgument = (name) => {
  const prefix = `${name}=`;
  const inlineArgument = process.argv.find((argument) => argument.startsWith(prefix));

  if (inlineArgument) {
    return inlineArgument.slice(prefix.length);
  }

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const recipient = getArgument('--to')?.trim();

try {
  if (!recipient || !EMAIL_PATTERN.test(recipient)) {
    throw new Error('Provide a valid recipient with --to someone@example.com');
  }

  const settings = getMailSettings();
  const issues = getMailConfigurationIssues(settings);

  if (issues.length > 0) {
    throw new Error(`SMTP configuration is incomplete: ${issues.join('; ')}`);
  }

  if (!settings.enabled) {
    throw new Error('SMTP is disabled. Set SMTP_ENABLED=true in api/.env');
  }

  const result = await sendSmtpTest(recipient);

  if (!result.sent) {
    throw new Error('SMTP test email was not sent');
  }

  console.log('Tickety SMTP test email sent successfully.');
} catch (error) {
  console.error(`SMTP test failed: ${error.message}`);
  process.exitCode = 1;
}
