import { MessageCircle } from 'lucide-react';
import { openWhatsApp } from '../../lib/contact';

interface WhatsAppButtonProps {
  message?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export default function WhatsAppButton({
  message = 'Bonjour, je souhaite obtenir un devis',
  position = 'bottom-right'
}: WhatsAppButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <button
      onClick={() => openWhatsApp(message)}
      className={`fixed ${positionClasses[position]} z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group`}
      aria-label="Contact via WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
      <span className="absolute right-full mr-3 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Contactez-nous
      </span>
    </button>
  );
}
