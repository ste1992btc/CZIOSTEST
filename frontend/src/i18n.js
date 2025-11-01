import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import itTranslations from "./locales/it.json";
import enTranslations from "./locales/en.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: itTranslations },
      en: { translation: enTranslations },
    },
    lng: "it", // lingua di default
    fallbackLng: "it",
    interpolation: { escapeValue: false },
  });

export default i18n;