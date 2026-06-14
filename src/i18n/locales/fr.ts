import type {TranslationShape} from './en';

export const fr: TranslationShape = {
  common: {
    appName: 'EnviroMaster',
    employee: 'Employé',
    admin: 'Administrateur',
    administrator: 'Administrateur',
    cancel: 'Annuler',
    logout: 'Se déconnecter',
    loading: 'Chargement...',
  },
  language: {
    label: 'Langue',
    en: 'English',
    es: 'Español',
    fr: 'Français',
  },
  landing: {
    tagline: 'Tarification et contrats de service',
    region: 'Au service du nord de la Virginie',
    badge: 'Plateforme de contrats et commissions',
    heroTitle: 'Bienvenue chez EnviroMaster',
    heroSubtitle: 'Gestion professionnelle des contrats',
    heroDescription:
      'Créez, gérez et suivez facilement les contrats de service client. Optimisez votre flux de travail, suivez les commissions et atteignez votre quota, le tout dans une seule app.',
    getStarted: 'Commencer',
    login: 'Se connecter',
    features: {
      agreements: {
        title: 'Gestion des contrats',
        description: 'Créez, prolongez et modifiez des contrats de service professionnels avec des formulaires guidés.',
      },
      commissions: {
        title: 'Suivi des commissions',
        description: 'Consultez vos gains par contrat grâce à des calculs transparents et par paliers.',
      },
      quota: {
        title: 'Progression du quota',
        description: 'Suivez votre quota hebdomadaire et par période et votre distance au palier suivant.',
      },
      documents: {
        title: 'Documents enregistrés',
        description: 'Gardez chaque contrat organisé, consultable et prêt à être envoyé.',
      },
    },
    footer: 'Enviro-Master Services International. Tous droits réservés.',
  },
  login: {
    subtitle: 'Connectez-vous à votre compte',
    username: "Nom d'utilisateur",
    password: 'Mot de passe',
    usernamePlaceholder: "Saisissez votre nom d'utilisateur",
    passwordPlaceholder: 'Saisissez votre mot de passe',
    signInAs: 'Se connecter en tant que {role}',
    enterCredentials: "Veuillez saisir le nom d'utilisateur et le mot de passe",
    infoAdmin: "Les comptes administrateur disposent d'un accès complet au système, y compris la gestion des utilisateurs.",
    infoEmployee: 'Les comptes employé peuvent créer et gérer des contrats de service.',
  },
  more: {
    quickActions: 'Actions rapides',
    accountInfo: 'Informations du compte',
    username: "Nom d'utilisateur",
    email: 'E-mail',
    role: 'Rôle',
    logoutConfirmTitle: 'Se déconnecter',
    logoutConfirmMessage: 'Êtes-vous sûr de vouloir vous déconnecter ?',
    actions: {
      myQuota: 'Mon quota',
      myQuotaDesc: 'Consultez la progression de votre quota',
      myCommissions: 'Mes commissions',
      myCommissionsDesc: 'Consultez vos gains de commissions',
      insideSales: 'Ventes internes',
      insideSalesDesc: 'Vérifiez votre statut de ventes internes',
      insideSalesDescAdmin: 'Vérifiez le statut des ventes internes',
      employeeCommissions: 'Commissions des employés',
      employeeCommissionsDesc: "Examinez les commissions de toute l'équipe",
      adminPanel: 'Panneau admin',
      adminPanelDesc: 'Gérez les prix, le personnel et les paramètres',
    },
  },
};
