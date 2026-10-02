import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// English first; Bangla covers navigation and common actions for now (PRD §6).
const resources = {
  en: {
    translation: {
      appName: 'Auto-Rickshaw Registry',
      nav: {
        dashboard: 'Dashboard',
        rickshaws: 'Rickshaws',
        drivers: 'Drivers',
        owners: 'Owners',
        users: 'Officers',
        audit: 'Audit log',
      },
      action: {
        registerRickshaw: 'Register rickshaw',
        registerDriver: 'Register driver',
        signOut: 'Sign out',
        changePassword: 'Change password',
      },
    },
  },
  bn: {
    translation: {
      appName: 'অটোরিকশা নিবন্ধন',
      nav: {
        dashboard: 'ড্যাশবোর্ড',
        rickshaws: 'রিকশা',
        drivers: 'চালক',
        owners: 'মালিক',
        users: 'কর্মকর্তা',
        audit: 'অডিট লগ',
      },
      action: {
        registerRickshaw: 'রিকশা নিবন্ধন',
        registerDriver: 'চালক নিবন্ধন',
        signOut: 'সাইন আউট',
        changePassword: 'পাসওয়ার্ড পরিবর্তন',
      },
    },
  },
}

function initialLanguage() {
  try {
    return localStorage.getItem('dars.lang') ?? 'en'
  } catch {
    return 'en'
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(lng: 'en' | 'bn') {
  void i18n.changeLanguage(lng)
  try {
    localStorage.setItem('dars.lang', lng)
  } catch {
    /* ignore */
  }
}

export default i18n
