/* This code fixed By Tg:@ImxCodex */
import puppeteer from 'puppeteer-core';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { AppError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatePath = join(__dirname, '..', '..', 'templates', 'transaction-receipt.html');
const RECEIPT_TIME_ZONE = 'Asia/Thimphu';

class ReceiptGeneratorService {
  constructor() {
    this.browser = null;
  }

  async getBrowser() {
    if (!this.browser || !this.browser.connected) {
      console.log('Launching new browser instance...');
      try {
        const executablePath =
          process.env.PUPPETEER_EXECUTABLE_PATH ||
          '/nix/store/bvqn8vwhfxary4j5ydb9l757jacbql96-google-chrome-138.0.7204.92/bin/google-chrome-stable';

        this.browser = await puppeteer.launch({
          headless: true,
          executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
          ],
        });
        console.log('Browser launched successfully');
      } catch (error) {
        console.error('Failed to launch browser:', error);
        throw AppError.internal(`Failed to start browser: ${error.message}`);
      }
    }

    return this.browser;
  }

  async loadTemplate() {
    if (!existsSync(templatePath)) {
      throw AppError.internal(`Template file not found at ${templatePath}`);
    }

    return readFile(templatePath, 'utf8');
  }

  async generateBuffer(variables = {}, width = 720, height = 1280) {
    const html = await this.loadTemplate();
    
    // Load main logo as base64
    let logoBase64 = '';
    const logoPath = join(dirname(templatePath), 'logo1.jpg');
    if (existsSync(logoPath)) {
      const logoBuffer = await readFile(logoPath);
      logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    }

    // Load logo O (for watermark) as base64
    let logoOBase64 = '';
    const logoOPath = join(dirname(templatePath), 'anotherone.png');
    if (existsSync(logoOPath)) {
      const logoOBuffer = await readFile(logoOPath);
      logoOBase64 = `data:image/png;base64,${logoOBuffer.toString('base64')}`;
    }

    const processedHtml = this.processVariables(html, {
      ...this.prepareReceiptVariables(variables),
      logo: logoBase64,
      logoO: logoOBase64
    });
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      console.log('Generating receipt buffer...', { width, height });
      await page.setViewport({ width: Number(width) || 720, height: Number(height) || 1280 });
      
      // Use 'load' which is faster and more reliable than waiting for network idle
      await page.setContent(processedHtml, { 
        waitUntil: 'load', 
        timeout: 60000 // 60 second timeout for slow networks
      });
      
      // Wait slightly for fonts/styles to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));

      const buffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        omitBackground: false,
      });

      console.log('Receipt buffer generated successfully');
      return Buffer.from(buffer);
    } catch (error) {
      console.error('Receipt generation error:', error);
      throw AppError.internal(`Failed to generate receipt: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async generatePreview(variables = {}, width = 720, height = 1280) {
    const buffer = await this.generateBuffer(variables, width, height);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  processVariables(html, variables) {
    let processed = html;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const replacement = value !== undefined && value !== null ? String(value) : '';
      processed = processed.replace(regex, this.escapeHtml(replacement));
    }

    return processed;
  }

  prepareReceiptVariables(variables = {}) {
    const prepared = { ...variables };

    prepared.amount = this.formatAmount(prepared.amount || '5,000.00');
    prepared.journalNo = this.formatJournalNo(prepared.journalNo);
    prepared.fromAccount = this.maskAccount(prepared.fromAccount || '94123444');
    prepared.toAccount = this.maskAccount(prepared.toAccount || '49123464');
    prepared.purpose = prepared.purpose || 'Go';
    prepared.date = this.formatReceiptDate(prepared.date);
    prepared.time = this.formatReceiptTime(prepared.time);

    return prepared;
  }

  formatAmount(value) {
    const text = String(value || '').trim().replace(/^Nu\.\s*/i, '').replace(/^Rs\.\s*/i, '').replace(/^INR\s*/i, '');
    return text || '5,000.00';
  }

  formatJournalNo(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 12);

    if (digits.length === 12) {
      return digits;
    }

    const seed = digits || '78464649';
    return seed + this.randomDigits(12 - seed.length);
  }

  maskAccount(value) {
    const text = String(value || '').trim();

    if (/x/i.test(text)) {
      return text.replace(/x/g, 'X');
    }

    const digits = text.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `${digits.slice(0, 2)}XXXXX${digits.slice(-2)}`;
    }

    const padded = digits.padEnd(4, '0');
    return `${padded.slice(0, 2)}XXXXX${padded.slice(-2)}`;
  }

  formatReceiptDate(value) {
    const text = String(value || '').trim();
    if (/^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/.test(text)) {
      return text.replace(/\s+/g, ' ');
    }

    const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return this.datePartsToReceipt(day, month, year);
    }

    const date = text ? new Date(text) : (() => {
      return new Date();
    })();

    if (Number.isNaN(date.getTime())) {
      return new Date().toLocaleDateString('en-GB', {
        timeZone: RECEIPT_TIME_ZONE,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    return date.toLocaleDateString('en-GB', {
      timeZone: RECEIPT_TIME_ZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  datePartsToReceipt(day, month, year) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthIndex = Number(month) - 1;
    return `${Number(day)} ${monthNames[monthIndex] || 'May'} ${year}`;
  }

  formatReceiptTime(value) {
    const text = String(value || '').trim();
    if (/^\d{1,2}:\d{2}:\d{2}\s?(AM|PM)$/i.test(text)) {
      return text.replace(/\s?(AM|PM)$/i, match => ` ${match.trim().toUpperCase()}`);
    }

    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    
    // Default to Bhutan time.
    const date = new Date();

    if (match) {
      date.setHours(Number(match[1]), Number(match[2]), Number(match[3] || '0'), 0);
    }

    return date.toLocaleTimeString('en-US', {
      timeZone: match ? undefined : RECEIPT_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  randomDigits(length) {
    let output = '';
    for (let index = 0; index < length; index += 1) {
      output += Math.floor(Math.random() * 10);
    }
    return output;
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return String(text).replace(/[&<>"']/g, char => map[char]);
  }
}

export const receiptGeneratorService = new ReceiptGeneratorService();
