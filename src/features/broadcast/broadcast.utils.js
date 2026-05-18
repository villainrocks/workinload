/* This code fixed By Tg:@ImxCodex */
const DEFAULT_JOURNAL_PREFIX = '78464649';

const purposeWords = [
  'Transfer', 'Payment', 'Lunch', 'Coffee', 'Rent', 'Bill', 'Gift', 'Services',
  'Project', 'Freelance', 'Shopping', 'Grocery', 'Investment', 'Savings',
  'Bonus', 'Salary', 'Refund', 'Credit', 'Debit', 'Fund', 'Capital', 'Asset',
  'Expense', 'Budget', 'Balance', 'Transaction', 'Invoice', 'Receipt',
  'Dinner', 'Snacks', 'Travel', 'Medical', 'Education', 'Utility',
  'Subscription', 'Insurance', 'Donation', 'Repayment',
];

const mobileResolutions = [
  { width: 1170, height: 2532, label: 'iPhone 13' },
  { width: 1284, height: 2778, label: 'iPhone 13 Pro Max' },
  { width: 1125, height: 2436, label: 'iPhone X/XS' },
  { width: 1242, height: 2688, label: 'iPhone XS Max' },
  { width: 1080, height: 2400, label: 'Samsung S22/S23' },
  { width: 1440, height: 3088, label: 'Samsung S23 Ultra' },
  { width: 1080, height: 2340, label: 'Samsung S21' },
  { width: 1440, height: 3200, label: 'Xiaomi 13 Pro' },
  { width: 1080, height: 2400, label: 'Google Pixel 7' },
  { width: 1440, height: 3120, label: 'Google Pixel 7 Pro' },
  { width: 1080, height: 2400, label: 'OnePlus 11' },
  { width: 720, height: 1600, label: 'Budget Android' },
];

const bgFills = ['#ffffff', '#fafafa', '#fdfdfd'];
const cornerRadii = ['12px', '16px', '20px', '24px'];
const RECEIPT_TIME_ZONE = 'Asia/Thimphu';

const fixedDelayOptions = Array.from({ length: 120 }, (_, i) => {
  const totalSecs = (i + 1) * 5;
  return {
    value: `${totalSecs}-${totalSecs}`,
    label: `+${formatDelay(totalSecs)}`,
  };
});

export const receiptScheduleOptions = [
  { value: '0-0', label: 'Receipt time now' },
  { value: '5-5', label: 'Receipt +5 sec' },
  { value: '10-10', label: 'Receipt +10 sec' },
  { value: '15-15', label: 'Receipt +15 sec' },
  ...fixedDelayOptions.filter(o => !['5-5','10-10','15-15'].includes(o.value)),
];

export const bookingDelayOptions = [
  { value: '0-0', label: 'Booking no offset' },
  { value: '5-5', label: 'Booking +5 sec' },
  { value: '10-10', label: 'Booking +10 sec' },
  { value: '15-15', label: 'Booking +15 sec' },
  ...fixedDelayOptions.filter(o => !['5-5','10-10','15-15'].includes(o.value)),
];

export const delayOptions = receiptScheduleOptions;

export const randomDigits = (length) => (
  Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
);

export const normalizeAccountInput = (value) => String(value || '').replace(/\D/g, '');

export const buildJournalNo = (value = DEFAULT_JOURNAL_PREFIX) => {
  const digits = normalizeAccountInput(value).slice(0, 12);
  const prefix = digits || DEFAULT_JOURNAL_PREFIX;

  return prefix.length >= 12 ? prefix : `${prefix}${randomDigits(12 - prefix.length)}`;
};

export const buildRandomBookingNo = () => {
  const digits = ['1', '2', '3', '4', '5', '6'];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const a = digits[Math.floor(Math.random() * digits.length)];
  const b = digits.filter((digit) => digit !== a)[Math.floor(Math.random() * 5)];
  const c = digits[Math.floor(Math.random() * digits.length)];
  const randLetter = () => alphabet[Math.floor(Math.random() * alphabet.length)];
  const randLetters = (n) => Array.from({ length: n }, randLetter).join('');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const patterns = [
    // 2-digit
    () => a + b,
    () => b + a,
    () => a + a,
    // 4-digit
    () => a + b + a + b,
    () => a + b + b + a,
    () => a + b + a + a,
    () => a + a + b + b,
    () => a + b + b + b,
    () => a + a + a + b,
    () => b + a + b + a,
    () => b + a + a + b,
    // 5-digit
    () => a + a + b + b + b,
    () => a + b + a + b + a,
    () => b + a + b + b + a,
    // 6-digit
    () => a + b + a + b + a + b,
    () => a + a + b + b + a + a,
    () => a + b + b + b + a + b,
    () => a + b + b + a + b + b,
    () => a + a + b + a + b + b,
    () => a + b + a + b + b + a,
    () => b + a + b + a + b + a,
    () => a + a + a + b + b + b,
    // Long repeats (10-14 digits)
    () => (a + b).repeat(5),
    () => (a + b).repeat(5) + a,
    () => a.repeat(5) + b + a.repeat(5),
    () => a.repeat(5) + b + a.repeat(4) + b + a,
    // Letter + digit mixes (Fgg24zdd, Fff34dd style)
    () => cap(randLetter()) + randLetters(2) + a + b + randLetters(2),
    () => cap(randLetter()) + randLetter().repeat(2) + a + b + randLetters(2),
    // Punctuated / decorated
    () => a + b + '!',
    () => '""' + a + b + a + b + a + b + '""',
    // Math-style (not real math — random digits)
    () => `${a}x${b}=${c}`,
  ];

  return patterns[Math.floor(Math.random() * patterns.length)]();
};

export const buildRandomPurpose = () => {
  const shortWords = ['faaa', 'ba', 'za', 'foo', 'bar', 'test', 'okay', 'done', 'set', 'tx', 'pay', 'abc'];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const styles = [
    () => shortWords[Math.floor(Math.random() * shortWords.length)],
    () => randomLetters(Math.floor(Math.random() * 2) + 2, alphabet),
    () => purposeWords[Math.floor(Math.random() * purposeWords.length)],
  ];
  const count = Math.floor(Math.random() * 2) + 1;

  return Array.from({ length: count }, () => (
    styles[Math.floor(Math.random() * styles.length)]()
  )).join(' ');
};

export const getRandomResolution = () => (
  mobileResolutions[Math.floor(Math.random() * mobileResolutions.length)]
);

export const getRandomFrame = () => ({
  topPadding: `${Math.floor(Math.random() * 15) + 15}px`,
  bottomPadding: `${Math.floor(Math.random() * 15) + 15}px`,
  sidePadding: `${Math.floor(Math.random() * 8) + 8}px`,
  bgFill: bgFills[Math.floor(Math.random() * bgFills.length)],
  cornerRadius: cornerRadii[Math.floor(Math.random() * cornerRadii.length)],
  showShadow: 'none',
});

const formatReceiptDateTime = (date) => ({
  date: date.toLocaleDateString('en-GB', {
    timeZone: RECEIPT_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  time: date.toLocaleTimeString('en-US', {
    timeZone: RECEIPT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }),
});

export const getBhutanDateTime = (offsetMinutes = 0, baseMs = Date.now()) => {
  const date = new Date(baseMs + Math.max(0, Number(offsetMinutes) || 0) * 60000);
  return formatReceiptDateTime(date);
};

export const getBhutanDateTimeAfterSeconds = (offsetSeconds = 0, baseMs = Date.now()) => {
  const safeSeconds = Math.max(0, Number(offsetSeconds) || 0);
  return formatReceiptDateTime(new Date(baseMs + safeSeconds * 1000));
};

export const parseDelayRange = (rangeStr, fallback = '0-0') => {
  const source = String(rangeStr || fallback);
  const [rawMin, rawMax = rawMin] = source.split('-').map(Number);
  const min = Number.isFinite(rawMin) ? Math.max(0, Math.floor(rawMin)) : 0;
  const max = Number.isFinite(rawMax) ? Math.max(min, Math.floor(rawMax)) : min;

  return { min, max, value: `${min}-${max}` };
};

export const getRandomDelay = (rangeStr) => {
  const { min, max } = parseDelayRange(rangeStr);
  if (min === 0 && max === 0) return 0;

  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const buildSchedulePlan = ({
  receiptDelayRange = '0-0',
  bookingDelayRange = '0-0',
  hasBooking = false,
} = {}) => {
  const receiptDelaySeconds = getRandomDelay(receiptDelayRange);
  const bookingDelaySeconds = hasBooking ? getRandomDelay(bookingDelayRange) : 0;
  const bookingTotalDelaySeconds = hasBooking ? bookingDelaySeconds : 0;

  const displayDelaySeconds = Math.max(receiptDelaySeconds, bookingTotalDelaySeconds);

  return {
    receiptDelaySeconds,
    bookingDelaySeconds,
    bookingTotalDelaySeconds,
    displayDelaySeconds,
    isScheduled: receiptDelaySeconds > 0,
    status: receiptDelaySeconds > 0 ? 'scheduling' : 'sending',
    activeLabel: hasBooking
      ? `${receiptDelaySeconds > 0 ? 'Scheduling' : 'Sending'} receipt ${receiptDelaySeconds > 0 ? `+${formatDelay(receiptDelaySeconds)}` : 'now'}, booking ${
        bookingDelaySeconds > 0 ? `+${formatDelay(bookingDelaySeconds)}` : 'no offset'
      }`
      : receiptDelaySeconds > 0
        ? `Scheduling receipt +${formatDelay(receiptDelaySeconds)}`
        : 'Sending receipt now',
    doneLabel: hasBooking
      ? `${receiptDelaySeconds > 0 ? 'Scheduled' : 'Sent'} receipt ${receiptDelaySeconds > 0 ? `+${formatDelay(receiptDelaySeconds)}` : 'now'}, booking ${
        bookingDelaySeconds > 0 ? `+${formatDelay(bookingDelaySeconds)}` : 'same time'
      }`
      : receiptDelaySeconds > 0
        ? `Receipt scheduled +${formatDelay(receiptDelaySeconds)}`
        : 'Receipt sent',
  };
};

export const getAccountDisplay = (account = {}) => {
  if (account.first_name) return account.first_name;
  return account.username ? `@${account.username}` : account.phone || String(account.id || 'Unknown');
};

export const formatReceiptPayload = (data) => ({
  ...data,
  journalNo: buildJournalNo(data.journalNo),
  fromAccount: normalizeAccountInput(data.fromAccount) || data.fromAccount,
  toAccount: normalizeAccountInput(data.toAccount) || data.toAccount,
});

export const assertBroadcastSucceeded = (response) => {
  const payload = response?.data?.data || response?.data || response;
  const summary = payload?.summary;
  if (!summary?.failed) return payload;

  const failed = payload?.data?.find((item) => item.status === 'failed');
  const phase = failed?.phase ? `${failed.phase}: ` : '';
  throw new Error(`${phase}${failed?.error || 'Telegram rejected one or more messages.'}`);
};

const randomLetters = (length, alphabet) => (
  Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
);

function formatDelay(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins <= 0) return `${secs} sec`;
  return secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
}
