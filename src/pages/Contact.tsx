import { MessageSquare, Phone, Mail, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';
import { CONTACT_INFO, openWhatsApp, makeCall, sendEmail } from '../lib/contact';

export default function Contact() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contactez-nous</h1>
        <p className="text-slate-600 mt-1">Notre équipe est à votre écoute</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => openWhatsApp()}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">WhatsApp</h3>
              <p className="text-white/90 mb-4">Réponse en moins de 2 heures</p>
              <p className="font-semibold">{CONTACT_INFO.whatsapp}</p>
              <button className="mt-4 px-6 py-2 bg-white text-green-600 rounded-xl font-semibold hover:bg-white/90 transition-colors">
                Ouvrir WhatsApp
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={makeCall}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Phone className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Téléphone</h3>
              <p className="text-white/90 mb-4">Lun-Ven: 8h-18h, Sam: 8h-13h</p>
              <p className="font-semibold">{CONTACT_INFO.phone}</p>
              <button className="mt-4 px-6 py-2 bg-white text-blue-600 rounded-xl font-semibold hover:bg-white/90 transition-colors">
                Appeler maintenant
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 rounded-xl">
              <Mail className="w-8 h-8 text-slate-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Email</h3>
              <p className="text-slate-600 mb-4">Réponse sous 24h</p>
              <p className="font-semibold text-slate-900">{CONTACT_INFO.email}</p>
              <button
                onClick={() => sendEmail()}
                className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
              >
                Envoyer un email
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 rounded-xl">
              <MapPin className="w-8 h-8 text-slate-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Adresse</h3>
              <p className="text-slate-600 mb-4">Visitez notre showroom</p>
              <p className="font-semibold text-slate-900">{CONTACT_INFO.address}</p>
              <p className="text-sm text-slate-600 mt-2">
                Lun-Ven: 8h-18h<br />
                Sam: 8h-13h
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Suivez-nous sur les réseaux sociaux</h3>
        <div className="flex flex-wrap gap-4">
          <a
            href={CONTACT_INFO.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-3 bg-[#1877F2] text-white rounded-xl hover:bg-[#0d68d6] transition-colors"
          >
            <Facebook className="w-5 h-5" />
            <span className="font-semibold">Facebook</span>
          </a>
          <a
            href={CONTACT_INFO.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            <Instagram className="w-5 h-5" />
            <span className="font-semibold">Instagram</span>
          </a>
          <a
            href={CONTACT_INFO.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-3 bg-[#0077B5] text-white rounded-xl hover:bg-[#006399] transition-colors"
          >
            <Linkedin className="w-5 h-5" />
            <span className="font-semibold">LinkedIn</span>
          </a>
        </div>
      </div>

      <div className="bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-2xl p-8 text-center">
        <h3 className="text-2xl font-bold mb-3">Besoin d'un devis personnalisé ?</h3>
        <p className="text-white/90 mb-6 max-w-2xl mx-auto">
          Notre équipe d'experts est prête à vous accompagner dans tous vos projets d'impression personnalisée
        </p>
        <button
          onClick={() => openWhatsApp('Bonjour, je souhaite obtenir un devis pour :')}
          className="px-8 py-3 bg-white text-brand-600 rounded-xl font-bold text-lg hover:bg-white/90 transition-colors shadow-lg"
        >
          Demander un devis maintenant
        </button>
      </div>
    </div>
  );
}
