export const CONTACT_INFO = {
  phone: '+216 12 345 678',
  phoneLink: 'tel:+21612345678',
  whatsapp: '+216 12 345 678',
  whatsappLink: 'https://wa.me/21612345678',
  email: 'contact@teewinek.com',
  emailLink: 'mailto:contact@teewinek.com',
  address: 'Tunis, Tunisie',
  website: 'https://www.teewinek.com',
  facebook: 'https://facebook.com/teewinek',
  instagram: 'https://instagram.com/teewinek',
  linkedin: 'https://linkedin.com/company/teewinek'
};

export function openWhatsApp(message?: string) {
  const defaultMessage = 'Bonjour, je souhaite obtenir un devis pour :';
  const encodedMessage = encodeURIComponent(message || defaultMessage);
  window.open(`${CONTACT_INFO.whatsappLink}?text=${encodedMessage}`, '_blank');
}

export function makeCall() {
  window.location.href = CONTACT_INFO.phoneLink;
}

export function sendEmail(subject?: string, body?: string) {
  const params = new URLSearchParams();
  if (subject) params.append('subject', subject);
  if (body) params.append('body', body);
  const queryString = params.toString();
  window.location.href = `${CONTACT_INFO.emailLink}${queryString ? '?' + queryString : ''}`;
}

export function shareContent(title: string, text: string, url?: string) {
  if (navigator.share) {
    navigator.share({
      title,
      text,
      url: url || window.location.href
    }).catch(err => console.log('Share failed:', err));
  } else {
    const message = `${title}\n${text}\n${url || window.location.href}`;
    openWhatsApp(message);
  }
}
