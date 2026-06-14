export const en = {
  common: {
    appName: 'EnviroMaster',
    employee: 'Employee',
    admin: 'Admin',
    administrator: 'Administrator',
    cancel: 'Cancel',
    logout: 'Logout',
    loading: 'Loading...',
  },
  language: {
    label: 'Language',
    en: 'English',
    es: 'Español',
    fr: 'Français',
  },
  landing: {
    tagline: 'Service Pricing & Agreements',
    region: 'Serving Northern Virginia',
    badge: 'Agreement & Commission Platform',
    heroTitle: 'Welcome to EnviroMaster',
    heroSubtitle: 'Professional Agreement Management',
    heroDescription:
      'Create, manage, and track customer service agreements with ease. Streamline your workflow, track commissions, and hit your quota — all in one app.',
    getStarted: 'Get Started',
    login: 'Log In',
    features: {
      agreements: {
        title: 'Agreement Management',
        description: 'Create, extend, and edit professional service agreements with guided forms.',
      },
      commissions: {
        title: 'Commission Tracking',
        description: 'See your earnings per agreement with transparent, tier-based calculations.',
      },
      quota: {
        title: 'Quota Progress',
        description: 'Track weekly and period quota progress and your distance to the next tier.',
      },
      documents: {
        title: 'Saved Documents',
        description: 'Keep every agreement organized, searchable, and ready to send.',
      },
    },
    footer: 'Enviro-Master Services International. All rights reserved.',
  },
  login: {
    subtitle: 'Sign in to your account',
    username: 'Username',
    password: 'Password',
    usernamePlaceholder: 'Enter your username',
    passwordPlaceholder: 'Enter your password',
    signInAs: 'Sign in as {role}',
    enterCredentials: 'Please enter username and password',
    infoAdmin: 'Admin accounts have full system access including user management.',
    infoEmployee: 'Employee accounts can create and manage service agreements.',
  },
  more: {
    quickActions: 'Quick Actions',
    accountInfo: 'Account Info',
    username: 'Username',
    email: 'Email',
    role: 'Role',
    logoutConfirmTitle: 'Logout',
    logoutConfirmMessage: 'Are you sure you want to logout?',
    actions: {
      myQuota: 'My Quota',
      myQuotaDesc: 'View your quota progress',
      myCommissions: 'My Commissions',
      myCommissionsDesc: 'View your commission earnings',
      insideSales: 'Inside Sales',
      insideSalesDesc: 'Check your inside sales status',
      insideSalesDescAdmin: 'Check inside sales status',
      employeeCommissions: 'Employee Commissions',
      employeeCommissionsDesc: 'Review commissions across the team',
      adminPanel: 'Admin Panel',
      adminPanelDesc: 'Manage pricing, staff and settings',
    },
  },
};

export type TranslationShape = typeof en;
