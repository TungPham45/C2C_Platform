import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Mock Email Service to simulate OTP sending to Gmail.
 * It logs to the console and a local log file for testing.
 */
@Injectable()
export class EmailService {
  private readonly logFilePath = path.join(process.cwd(), 'otp_simulation.log');

  async sendOtpEmail(to: string, code: string, purpose: string) {
    const message = `
=========================================
[EMAIL SIMULATION]
To: ${to}
Subject: Your Verification Code
Purpose: ${purpose}
Code: ${code}
Time: ${new Date().toLocaleString()}
=========================================
`;

    // 1. Log to console for real-time visibility in dev terminal
    console.log(message);

    // 2. Write to a local log file so the agent/user can check it later
    try {
      fs.appendFileSync(this.logFilePath, message);
    } catch (err) {
      console.error('Failed to write to OTP log file', err);
    }

    return true;
  }
}
