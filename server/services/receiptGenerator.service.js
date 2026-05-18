/* Fully Fixed For Replit + Puppeteer + Supabase */

import puppeteer from 'puppeteer-core';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { AppError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const templatePath = join(
  __dirname,
  '..',
  '..',
  'templates',
  'transaction-receipt.html'
);

const RECEIPT_TIME_ZONE = 'Asia/Thimphu';

class ReceiptGeneratorService {
  constructor() {
    this.browser = null;
  }

  async getChromePath() {
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/nix/store/bvqn8vwhfxary4j5ydb9l757jacbql96-google-chrome-138.0.7204.92/bin/google-chrome-stable',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
    ].filter(Boolean);

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        console.log('Chrome found at:', path);
        return path;
      }
    }

    throw new Error(
      'Chrome browser not found. Add pkgs.google-chrome in replit.nix'
    );
  }

  async getBrowser() {
    try {
      if (!this.browser) {

        console.log('Launching Chrome browser...');

        const chromePath = await this.getChromePath();

        console.log('Using Chrome path:', chromePath);

        this.browser = await puppeteer.launch({
          executablePath: chromePath,

          headless: true,

          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-first-run',
            '--safebrowsing-disable-auto-update',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-software-rasterizer',
            '--disable-features=site-per-process',
            '--no-zygote',
            '--single-process'
          ],

          timeout: 60000
        });

        this.browser.on('disconnected', () => {
          console.log('Browser disconnected');
          this.browser = null;
        });

        console.log('Browser launched successfully');
      }

      return this.browser;

    } catch (error) {

      console.error('Browser launch failed:', error);

      throw AppError.internal(
        `Failed to start browser: ${error.message}`
      );
    }
  }

  async loadTemplate() {
    if (!existsSync(templatePath)) {
      throw AppError.internal(
        `Template file not found at ${templatePath}`
      );
    }

    return await readFile(templatePath, 'utf8');
  }

  async generateBuffer(
    variables = {},
    width = 720,
    height = 1280
  ) {

    const html = await this.loadTemplate();

    let logoBase64 = '';

    const logoPath = join(
      dirname(templatePath),
      'logo1.jpg'
    );

    if (existsSync(logoPath)) {
      const logoBuffer = await readFile(logoPath);

      logoBase64 =
        `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    }

    let logoOBase64 = '';

    const logoOPath = join(
      dirname(templatePath),
      'anotherone.png'
    );

    if (existsSync(logoOPath)) {
      const logoOBuffer = await readFile(logoOPath);

      logoOBase64 =
        `data:image/png;base64,${logoOBuffer.toString('base64')}`;
    }

    const processedHtml = this.processVariables(html, {
      ...this.prepareReceiptVariables(variables),
      logo: logoBase64,
      logoO: logoOBase64
    });

    const browser = await this.getBrowser();

    const page = await browser.newPage();

    try {

      console.log('Generating receipt image...');

      await page.setViewport({
        width: Number(width) || 720,
        height: Number(height) || 1280
      });

      await page.setContent(processedHtml, {
        waitUntil: 'load',
        timeout: 60000
      });

      await new Promise(resolve =>
        setTimeout(resolve, 1000)
      );

      const buffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        omitBackground: false
      });

      console.log('Receipt generated successfully');

      return Buffer.from(buffer);

    } catch (error) {

      console.error('Receipt generation error:', error);

      throw AppError.internal(
        `Failed to generate receipt: ${error.message}`
      );

    } finally {

      try {
        await page.close();
      } catch {
        console.log('Page already closed');
      }
    }
  }

  async generatePreview(
    variables = {},
    width = 720,
    height = 1280
  ) {

    const buffer = await this.generateBuffer(
      variables,
      width,
      height
    );

    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  processVariables(html, variables) {

    let processed = html;

    for (const [key, value] of Object.entries(variables)) {

      const regex = new RegExp(
        `\\{\\{${key}\\}\\}`,
        'g'
      );

      const replacement =
        value !== undefined && value !== null
          ? String(value)
          : '';

      processed = processed.replace(
        regex,
        this.escapeHtml(replacement)
      );
    }

    return processed;
  }

  prepareReceiptVariables(variables = {}) {

    const prepared = { ...variables };

    prepared.amount = this.formatAmount(
      prepared.amount || '5,000.00'
    );

    prepared.journalNo = this.formatJournalNo(
      prepared.journalNo
    );

    prepared.fromAccount = this.maskAccount(
      prepared.fromAccount || '94123444'
    );

    prepared.toAccount = this.maskAccount(
      prepared.toAccount || '49123464'
    );

    prepared.purpose =
      prepared.purpose || 'Go';

    prepared.date = this.formatReceiptDate(
      prepared.date
    );

    prepared.time = this.formatReceiptTime(
      prepared.time
    );

    return prepared;
  }

  formatAmount(value) {

    const text = String(value || '')
      .trim()
      .replace(/^Nu\.\s*/i, '')
      .replace(/^Rs\.\s*/i, '')
      .replace(/^INR\s*/i, '');

    return text || '5,000.00';
  }

  formatJournalNo(value) {

    const digits = String(value || '')
      .replace(/\D/g, '')
      .slice(0, 12);

    if (digits.length === 12) {
      return digits;
    }

    const seed = digits || '78464649';

    return seed +
      this.randomDigits(12 - seed.length);
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

    const date = value
      ? new Date(value)
      : new Date();

    return date.toLocaleDateString('en-GB', {
      timeZone: RECEIPT_TIME_ZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatReceiptTime() {

    const date = new Date();

    return date.toLocaleTimeString('en-US', {
      timeZone: RECEIPT_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  randomDigits(length) {

    let output = '';

    for (let i = 0; i < length; i++) {
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
      "'": '&#039;'
    };

    return String(text).replace(
      /[&<>\"']/g,
      char => map[char]
    );
  }
}

export const receiptGeneratorService =
  new ReceiptGeneratorService();