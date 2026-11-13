/*
 * Business card reader.
 * Uses Tesseract.js (free OCR that runs in the browser — no API key needed)
 * and then picks out name, phone, email, company etc. from the text.
 */
import { createWorker } from 'tesseract.js';
import { INDIAN_STATES } from './utils';

let workerPromise = null;
let progressCallback = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      logger: (m) => {
        if (progressCallback && m.status === 'recognizing text') {
          progressCallback(m.progress);
        }
      },
    });
  }
  return workerPromise;
}

/* Shrink big phone photos and boost contrast — faster and more accurate OCR */
async function prepareImage(file, maxSize = 1800) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('This image format is not supported. Use JPG or PNG.'));
      i.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.filter = 'grayscale(1) contrast(1.35)';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* Read one card. onProgress gets a number from 0 to 1. */
export async function scanCard(file, onProgress) {
  const worker = await getWorker();
  const image = await prepareImage(file);
  progressCallback = onProgress || null;
  try {
    const { data } = await worker.recognize(image);
    return { text: data.text, fields: parseCardText(data.text) };
  } finally {
    progressCallback = null;
  }
}

/* ---------------- Text parsing ---------------- */

const COMPANY_WORDS = /\b(pvt|private|ltd|limited|llp|inc|industries|industry|enterprises?|corporation|corp|company|group|traders|trading|solutions|engineering|engineers|exports?|imports?|steels?|wires?|infra|constructions?|builders|associates|agency|agencies|works|mills|manufactur\w*|international|technologies|systems|fabricators?|hardware|metals?|projects)\b/i;
const TITLE_WORDS = /\b(manager|director|ceo|cto|cfo|coo|founder|owner|proprietor|partner|engineer|executive|officer|head|president|chairman|sales|marketing|purchase|procurement|consultant|vp|gm|agm|dgm|md|supervisor|incharge|in-charge|representative|specialist|accountant|admin|business development)\b/i;
const ADDRESS_WORDS = /\b(road|rd\.?|street|st\.|sector|plot|nagar|area|phase|industrial|estate|marg|lane|floor|building|bldg|near|opp\.?|block|colony|village|dist\.?|district|tower|complex|park|chowk|bazar|bazaar|pin)\b/i;
const FREE_MAIL = ['gmail.com', 'yahoo.com', 'yahoo.co.in', 'hotmail.com', 'outlook.com',
  'rediffmail.com', 'live.com', 'icloud.com', 'ymail.com', 'aol.com'];

const CITY_STATE = {
  'new delhi': 'Delhi', delhi: 'Delhi', noida: 'Uttar Pradesh', 'greater noida': 'Uttar Pradesh',
  ghaziabad: 'Uttar Pradesh', lucknow: 'Uttar Pradesh', kanpur: 'Uttar Pradesh', meerut: 'Uttar Pradesh',
  agra: 'Uttar Pradesh', varanasi: 'Uttar Pradesh', gurgaon: 'Haryana', gurugram: 'Haryana',
  faridabad: 'Haryana', sonipat: 'Haryana', panipat: 'Haryana', ambala: 'Haryana', mumbai: 'Maharashtra',
  pune: 'Maharashtra', thane: 'Maharashtra', nagpur: 'Maharashtra', nashik: 'Maharashtra',
  aurangabad: 'Maharashtra', ahmedabad: 'Gujarat', surat: 'Gujarat', vadodara: 'Gujarat', rajkot: 'Gujarat',
  bengaluru: 'Karnataka', bangalore: 'Karnataka', mysuru: 'Karnataka', chennai: 'Tamil Nadu',
  coimbatore: 'Tamil Nadu', hyderabad: 'Telangana', kolkata: 'West Bengal', howrah: 'West Bengal',
  jaipur: 'Rajasthan', jodhpur: 'Rajasthan', udaipur: 'Rajasthan', ludhiana: 'Punjab', amritsar: 'Punjab',
  jalandhar: 'Punjab', mohali: 'Punjab', chandigarh: 'Chandigarh', indore: 'Madhya Pradesh',
  bhopal: 'Madhya Pradesh', raipur: 'Chhattisgarh', patna: 'Bihar', ranchi: 'Jharkhand',
  jamshedpur: 'Jharkhand', bhubaneswar: 'Odisha', guwahati: 'Assam', dehradun: 'Uttarakhand',
  haridwar: 'Uttarakhand', kochi: 'Kerala', visakhapatnam: 'Andhra Pradesh', vijayawada: 'Andhra Pradesh',
};

function titleCase(s) {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function extractPhones(text) {
  const found = [];
  for (const raw of text.match(/\+?\d[\d\s\-().]{7,}\d/g) || []) {
    let d = raw.replace(/\D/g, '');
    if (d.length < 8 || d.length > 13) continue;
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0') && /^[6-9]/.test(d.slice(1))) d = d.slice(1);
    if (!found.includes(d)) found.push(d);
  }
  const mobiles = found.filter((p) => /^[6-9]\d{9}$/.test(p));
  const others = found.filter((p) => !mobiles.includes(p));
  return [...mobiles, ...others];
}

export function parseCardText(text) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/[|_~`"“”©®™]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1);
  const lower = text.toLowerCase();

  const emails = [...new Set((text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
    .map((e) => e.toLowerCase()))];
  const email = emails[0] || '';

  const phones = extractPhones(text);

  let website = '';
  for (const l of lines) {
    if (l.includes('@')) continue;
    const m = l.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|in|co\.in|net|org|biz|info|co)\b/i);
    if (m) { website = m[0].toLowerCase(); break; }
  }

  const textLine = (l) => !/\d/.test(l) && !l.includes('@') && !/www\.|\.com|\.in\b/i.test(l);

  const designationIdx = lines.findIndex((l) => textLine(l) && TITLE_WORDS.test(l) && l.split(' ').length <= 6);
  const designation = designationIdx >= 0 ? titleCase(lines[designationIdx]) : '';

  let company = lines.find((l) => textLine(l) && COMPANY_WORDS.test(l) && !TITLE_WORDS.test(l)) || '';
  if (!company && email && !FREE_MAIL.includes(email.split('@')[1])) {
    company = titleCase(email.split('@')[1].split('.')[0]);
  }

  const looksLikeName = (l) =>
    textLine(l) &&
    /^[A-Za-z][A-Za-z.\s']+$/.test(l) &&
    l.split(' ').length >= 2 && l.split(' ').length <= 4 &&
    l !== company && !COMPANY_WORDS.test(l) && !TITLE_WORDS.test(l) && !ADDRESS_WORDS.test(l) &&
    !INDIAN_STATES.some((s) => s.toLowerCase() === l.toLowerCase());

  let name = '';
  if (designationIdx > 0 && looksLikeName(lines[designationIdx - 1])) {
    name = lines[designationIdx - 1];
  } else if (designationIdx >= 0 && designationIdx < lines.length - 1 && looksLikeName(lines[designationIdx + 1])) {
    name = lines[designationIdx + 1];
  } else {
    name = lines.find(looksLikeName) || '';
  }
  if (name && name === name.toUpperCase()) name = titleCase(name);
  if (company && company === company.toUpperCase()) company = titleCase(company);

  let state = INDIAN_STATES.find((s) => lower.includes(s.toLowerCase())) || '';
  let city = '';
  for (const [c, s] of Object.entries(CITY_STATE)) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(text)) {
      city = titleCase(c);
      if (!state) state = s;
      break;
    }
  }

  const address = lines
    .filter((l) => (ADDRESS_WORDS.test(l) || /\b\d{6}\b/.test(l)) && !l.includes('@'))
    .join(', ');

  const notes = [
    designation && `Designation: ${designation}`,
    website && `Website: ${website}`,
    address && `Address: ${address}`,
    phones.length > 1 && `Other phones: ${phones.slice(1).join(', ')}`,
    emails.length > 1 && `Other emails: ${emails.slice(1).join(', ')}`,
  ].filter(Boolean).join('\n');

  return {
    full_name: name,
    designation,
    company,
    phone: phones[0] || '',
    email,
    website,
    state,
    city,
    notes,
  };
}