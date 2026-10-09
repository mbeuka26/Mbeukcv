/** Langues d’affichage / export du CV classique (contenu traduit, modèle inchangé). */
export const CLASSIC_DISPLAY_LOCALES = [
  'fr',
  'en-US',
  'en-GB',
  'es',
  'de',
  'pt',
  'ar',
  'zh',
  'it',
] as const;

export type ClassicDisplayLocale = (typeof CLASSIC_DISPLAY_LOCALES)[number];

export function isClassicDisplayLocale(value: string): value is ClassicDisplayLocale {
  return (CLASSIC_DISPLAY_LOCALES as readonly string[]).includes(value);
}

export const LOCALE_LABELS: Record<ClassicDisplayLocale, string> = {
  fr: 'Français (original saisi)',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  ar: 'العربية',
  zh: '中文 (mandarin)',
  it: 'Italiano',
};

export function localeHtmlLang(locale: ClassicDisplayLocale): string {
  if (locale === 'en-US' || locale === 'en-GB') return 'en';
  if (locale === 'zh') return 'zh-Hans';
  return locale;
}

export function localeDirection(locale: ClassicDisplayLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export interface SectionLabels {
  experience: string;
  education: string;
  skills: string;
  languages: string;
  certifications: string;
  interests: string;
  references: string;
  profile: string;
  curriculumVitae: string;
  professionalSummary: string;
}

const LABELS: Record<ClassicDisplayLocale, SectionLabels> = {
  fr: {
    experience: 'EXPÉRIENCE PROFESSIONNELLE',
    education: 'FORMATION',
    skills: 'COMPÉTENCES',
    languages: 'LANGUES',
    certifications: 'CERTIFICATIONS',
    interests: "CENTRES D'INTÉRÊT",
    references: 'RÉFÉRENCES',
    profile: 'Profil',
    curriculumVitae: 'CURRICULUM VITAE',
    professionalSummary: 'RÉSUMÉ PROFESSIONNEL',
  },
  'en-US': {
    experience: 'PROFESSIONAL EXPERIENCE',
    education: 'EDUCATION',
    skills: 'SKILLS',
    languages: 'LANGUAGES',
    certifications: 'CERTIFICATIONS',
    interests: 'INTERESTS',
    references: 'REFERENCES',
    profile: 'Profile',
    curriculumVitae: 'CURRICULUM VITAE',
    professionalSummary: 'PROFESSIONAL SUMMARY',
  },
  'en-GB': {
    experience: 'PROFESSIONAL EXPERIENCE',
    education: 'EDUCATION',
    skills: 'SKILLS',
    languages: 'LANGUAGES',
    certifications: 'CERTIFICATIONS',
    interests: 'INTERESTS',
    references: 'REFERENCES',
    profile: 'Profile',
    curriculumVitae: 'CURRICULUM VITAE',
    professionalSummary: 'PROFESSIONAL SUMMARY',
  },
  es: {
    experience: 'EXPERIENCIA PROFESIONAL',
    education: 'FORMACIÓN',
    skills: 'COMPETENCIAS',
    languages: 'IDIOMAS',
    certifications: 'CERTIFICACIONES',
    interests: 'INTERESES',
    references: 'REFERENCIAS',
    profile: 'Perfil',
    curriculumVitae: 'CURRICULUM VITAE',
    professionalSummary: 'RESUMEN PROFESIONAL',
  },
  de: {
    experience: 'BERUFSERFAHRUNG',
    education: 'AUSBILDUNG',
    skills: 'FÄHIGKEITEN',
    languages: 'SPRACHEN',
    certifications: 'ZERTIFIKATE',
    interests: 'INTERESSEN',
    references: 'REFERENZEN',
    profile: 'Kurzprofil',
    curriculumVitae: 'LEBENSLAUF',
    professionalSummary: 'ZUSAMMENFASSUNG',
  },
  pt: {
    experience: 'EXPERIÊNCIA PROFISSIONAL',
    education: 'FORMAÇÃO',
    skills: 'COMPETÊNCIAS',
    languages: 'IDIOMAS',
    certifications: 'CERTIFICAÇÕES',
    interests: 'INTERESSES',
    references: 'REFERÊNCIAS',
    profile: 'Perfil',
    curriculumVitae: 'CURRICULUM VITAE',
    professionalSummary: 'RESUMO PROFISSIONAL',
  },
  ar: {
    experience: 'الخبرة المهنية',
    education: 'التعليم',
    skills: 'المهارات',
    languages: 'اللغات',
    certifications: 'الشهادات',
    interests: 'الاهتمامات',
    references: 'المراجع',
    profile: 'الملخص',
    curriculumVitae: 'السيرة الذاتية',
    professionalSummary: 'الملخص المهني',
  },
  zh: {
    experience: '工作经历',
    education: '教育背景',
    skills: '技能',
    languages: '语言',
    certifications: '证书',
    interests: '兴趣爱好',
    references: '推荐人',
    profile: '简介',
    curriculumVitae: '简历',
    professionalSummary: '职业概述',
  },
  it: {
    experience: 'ESPERIENZA PROFESSIONALE',
    education: 'FORMAZIONE',
    skills: 'COMPETENZE',
    languages: 'LINGUE',
    certifications: 'CERTIFICAZIONI',
    interests: 'INTERESSI',
    references: 'REFERENZE',
    profile: 'Profilo',
    curriculumVitae: 'CURRICULUM VITAE',
    professionalSummary: 'SINTESI PROFESSIONALE',
  },
};

export function sectionLabelsFor(locale: ClassicDisplayLocale): SectionLabels {
  return LABELS[locale] ?? LABELS.fr;
}

const PRESENT: Record<ClassicDisplayLocale, string> = {
  fr: "Aujourd'hui",
  'en-US': 'Present',
  'en-GB': 'Present',
  es: 'Actualidad',
  de: 'Heute',
  pt: 'Atual',
  ar: 'حتى الآن',
  zh: '至今',
  it: 'In corso',
};

export function presentDayLabel(locale: ClassicDisplayLocale): string {
  return PRESENT[locale] ?? PRESENT.fr;
}

export function claudeLocaleName(locale: ClassicDisplayLocale): string {
  switch (locale) {
    case 'en-US':
      return 'American English';
    case 'en-GB':
      return 'British English';
    case 'zh':
      return 'Simplified Chinese (Mandarin)';
    case 'pt':
      return 'Portuguese';
    case 'ar':
      return 'Modern Standard Arabic';
    default:
      return LOCALE_LABELS[locale];
  }
}
