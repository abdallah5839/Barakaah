/**
 * Traductions Onboarding Sakina
 * Français (FR) et Arabe (AR)
 */

export type OnboardingLang = 'fr' | 'ar';

const translations = {
  fr: {
    // Language selection
    langTitle: 'Choisissez votre langue',
    langSubtitle: 'اختر لغتك',
    langFrench: 'Français',
    langArabic: 'العربية',

    // Slide 1 - Welcome
    slide1Title: 'Bienvenue sur Sakina',
    slide1Subtitle: 'Votre compagnon spirituel au quotidien',
    slide1Desc: 'Prieres, Coran, Duas et outils spirituels reunis en une seule application.',

    // Slide 2 - Circle Reading
    slide2Title: 'Cercle de Lecture',
    slide2Subtitle: 'Lisez le Coran ensemble',
    slide2Desc: 'Rejoignez un cercle de lecture et partagez votre progression avec la communaute.',

    // Slide 3 - Tools
    slide3Title: 'Outils Spirituels',
    slide3Subtitle: 'Tout ce dont vous avez besoin',
    slide3Desc: 'Horaires de priere, Qibla, Tasbih, Calendrier Hijri et bien plus encore.',

    // Slide 4 - Philosophy
    slide4Title: 'Notre Philosophie',
    slide4Subtitle: 'Sakina — La Quietude',
    slide4Desc: 'Une application concue avec amour pour vous accompagner dans votre cheminement spirituel.',

    // Permission - Location
    permLocationTitle: 'Localisation',
    permLocationSubtitle: 'Pour des horaires precis',
    permLocationDesc: 'Activez la localisation pour calculer les horaires de priere et la direction de la Qibla adaptes a votre position.',
    permLocationBtn: 'Activer la localisation',
    permLocationSkip: 'Plus tard',

    // Permission - Notifications
    permNotifTitle: 'Notifications',
    permNotifSubtitle: 'Ne manquez aucune priere',
    permNotifDesc: 'Recevez un rappel avant chaque priere pour ne jamais en manquer une.',
    permNotifBtn: 'Activer les notifications',
    permNotifSkip: 'Plus tard',

    // Navigation
    next: 'Suivant',
    skip: 'Passer',
    start: 'Bismillah, commencer',
    back: 'Retour',
  },

  ar: {
    // Language selection
    langTitle: 'اختر لغتك',
    langSubtitle: 'Choisissez votre langue',
    langFrench: 'Français',
    langArabic: 'العربية',

    // Slide 1 - Welcome
    slide1Title: 'مرحبا بكم في سكينة',
    slide1Subtitle: 'رفيقكم الروحي اليومي',
    slide1Desc: 'الصلوات والقرآن والأدعية والأدوات الروحية مجتمعة في تطبيق واحد.',

    // Slide 2 - Circle Reading
    slide2Title: 'حلقة القراءة',
    slide2Subtitle: 'اقرأوا القرآن معاً',
    slide2Desc: 'انضموا إلى حلقة قراءة وشاركوا تقدمكم مع المجتمع.',

    // Slide 3 - Tools
    slide3Title: 'أدوات روحية',
    slide3Subtitle: 'كل ما تحتاجونه',
    slide3Desc: 'مواقيت الصلاة، القبلة، التسبيح، التقويم الهجري والمزيد.',

    // Slide 4 - Philosophy
    slide4Title: 'فلسفتنا',
    slide4Subtitle: 'سكينة — الطمأنينة',
    slide4Desc: 'تطبيق صُمم بحب ليرافقكم في مسيرتكم الروحية.',

    // Permission - Location
    permLocationTitle: 'الموقع',
    permLocationSubtitle: 'لمواقيت دقيقة',
    permLocationDesc: 'فعّلوا الموقع لحساب مواقيت الصلاة واتجاه القبلة حسب موقعكم.',
    permLocationBtn: 'تفعيل الموقع',
    permLocationSkip: 'لاحقاً',

    // Permission - Notifications
    permNotifTitle: 'الإشعارات',
    permNotifSubtitle: 'لا تفوّتوا أي صلاة',
    permNotifDesc: 'استقبلوا تذكيراً قبل كل صلاة حتى لا تفوتكم.',
    permNotifBtn: 'تفعيل الإشعارات',
    permNotifSkip: 'لاحقاً',

    // Navigation
    next: 'التالي',
    skip: 'تخطي',
    start: 'بسم الله، ابدأ',
    back: 'رجوع',
  },
} as const;

export type OnboardingTranslations = { [K in keyof typeof translations.fr]: string };

export const getOnboardingText = (lang: OnboardingLang): OnboardingTranslations => {
  return translations[lang];
};

export default translations;
