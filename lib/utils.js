// ============================================
// Utility Functions
// ============================================

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function generateOrderNumber() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${num}`;
}

export function generateSKU(name) {
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

export function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatCurrency(amount) {
  return `৳${amount.toLocaleString('en-BD')}`;
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export function calculateDiscountPercent(basePrice, salePrice) {
  if (!salePrice || salePrice >= basePrice) return 0;
  return Math.round(((basePrice - salePrice) / basePrice) * 100);
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateBDPhone(phone) {
  const re = /^01[3-9]\d{8}$/;
  return re.test(phone.replace(/[-\s]/g, ''));
}

export function getStatusColor(status) {
  const colors = {
    pending: 'bg-gray-100 text-gray-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    returned: 'bg-red-100 text-red-700',
    paid: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    active: 'bg-green-100 text-green-700',
    hidden: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-700',
    hot: 'bg-red-100 text-red-700',
    warm: 'bg-orange-100 text-orange-700',
    cold: 'bg-blue-100 text-blue-700',
    converted: 'bg-green-100 text-green-700',
    unread: 'bg-red-100 text-red-700',
    read: 'bg-gray-100 text-gray-700',
    replied: 'bg-green-100 text-green-700',
    income: 'bg-green-100 text-green-700',
    expense: 'bg-red-100 text-red-700',
    refund: 'bg-orange-100 text-orange-700',
    picked_up: 'bg-blue-100 text-blue-700',
    in_transit: 'bg-purple-100 text-purple-700',
    out_for_delivery: 'bg-indigo-100 text-indigo-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getStockColor(stock) {
  if (stock === 0) return 'bg-gray-100 text-gray-600';
  if (stock < 5) return 'bg-red-100 text-red-700';
  if (stock <= 20) return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
}

export function getStockLabel(stock) {
  if (stock === 0) return 'Out of Stock';
  if (stock < 5) return 'Very Low';
  if (stock <= 20) return 'Low Stock';
  return 'In Stock';
}

export function truncate(str, len) {
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
}

export function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export const BD_CITIES = [
  'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna',
  'Barisal', 'Rangpur', 'Mymensingh', 'Comilla', 'Gazipur',
  'Narayanganj', 'Tongi', 'Bogra', 'Cox\'s Bazar', 'Jessore',
];

export const COURIER_SERVICES = [
  { value: 'pathao', label: 'Pathao' },
  { value: 'steadfast', label: 'Steadfast' },
  { value: 'redex', label: 'Redex' },
  { value: 'sundarban', label: 'Sundarban' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'bank', label: 'Bank Transfer' },
];

export const ORDER_STATUSES = [
  'pending', 'processing', 'shipped', 'delivered', 'returned'
];

export const EXPENSE_CATEGORIES = [
  'Advertising', 'Courier', 'Supplies', 'Rent', 'Utilities', 'Salaries', 'Supplier Payment', 'Other'
];

export const INCOME_CATEGORIES = ['Sales', 'Other Income'];
