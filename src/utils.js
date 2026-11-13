export const OFFLINE_SOURCES = ['Manual Entry', 'Phone Call', 'Walk-in', 'Exhibition', 'Reference', 'Email'];

export const STATUSES = ['Needs Mapping', 'Pending', 'Contacted', 'Follow Up', 'Quotation Sent', 'Won', 'Lost'];

export const CUSTOMER_TYPES = ['Institution', 'Dealer', 'Distributor', 'Contractor', 'Retail', 'Other'];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

function toDate(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
}

export function formatDateTime(value) {
  const d = toDate(value);
  return d
    ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';
}

export function statusClass(status) {
  return 'pill status-' + String(status || 'unknown').toLowerCase().replace(/\s+/g, '-');
}

export function sourceClass(source) {
  if (source === 'Google Ads') return 'pill src-ads';
  if (OFFLINE_SOURCES.includes(source)) return 'pill src-manual';
  return 'pill src-web';
}

export function salesName(email) {
  if (!email) return 'Not assigned';
  const name = email.split('@')[0].replace(/[._]/g, ' ');
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function whatsappLink(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  return digits.length >= 11 ? `https://wa.me/${digits}` : null;
}