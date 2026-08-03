import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { sendVerificationCodeEmail } from '../src/services/email.service';

async function test() {
  console.log('Testing sendVerificationCodeEmail...');
  console.log('GMAIL_USER:', process.env.GMAIL_USER);
  console.log('GMAIL_APP_PASSWORD set?:', !!process.env.GMAIL_APP_PASSWORD);
  try {
    const res = await sendVerificationCodeEmail('test@example.com', 1234);
    console.log('Result:', res);
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

test();
