import type {TranslationShape} from './en';

export const es: TranslationShape = {
  common: {
    appName: 'EnviroMaster',
    employee: 'Empleado',
    admin: 'Administrador',
    administrator: 'Administrador',
    cancel: 'Cancelar',
    logout: 'Cerrar sesión',
    loading: 'Cargando...',
  },
  language: {
    label: 'Idioma',
    en: 'English',
    es: 'Español',
    fr: 'Français',
  },
  landing: {
    tagline: 'Precios y acuerdos de servicio',
    region: 'Al servicio del norte de Virginia',
    badge: 'Plataforma de acuerdos y comisiones',
    heroTitle: 'Bienvenido a EnviroMaster',
    heroSubtitle: 'Gestión profesional de acuerdos',
    heroDescription:
      'Cree, gestione y controle acuerdos de servicio al cliente con facilidad. Optimice su flujo de trabajo, controle las comisiones y alcance su cuota, todo en una sola app.',
    getStarted: 'Comenzar',
    login: 'Iniciar sesión',
    featuresHeading: 'Todo lo que necesitas',
    featuresSubheading: 'Diseñado para vendedores en el campo',
    features: {
      agreements: {
        title: 'Gestión de acuerdos',
        description: 'Cree, extienda y edite acuerdos de servicio profesionales con formularios guiados.',
      },
      commissions: {
        title: 'Seguimiento de comisiones',
        description: 'Vea sus ganancias por acuerdo con cálculos transparentes y por niveles.',
      },
      quota: {
        title: 'Progreso de cuota',
        description: 'Controle su cuota semanal y por período y cuánto le falta para el siguiente nivel.',
      },
      documents: {
        title: 'Documentos guardados',
        description: 'Mantenga cada acuerdo organizado, fácil de buscar y listo para enviar.',
      },
    },
    footer: 'Enviro-Master Services International. Todos los derechos reservados.',
  },
  login: {
    subtitle: 'Inicie sesión en su cuenta',
    username: 'Nombre de usuario',
    password: 'Contraseña',
    usernamePlaceholder: 'Introduzca su nombre de usuario',
    passwordPlaceholder: 'Introduzca su contraseña',
    signInAs: 'Iniciar sesión como {role}',
    enterCredentials: 'Introduzca el nombre de usuario y la contraseña',
    infoAdmin: 'Las cuentas de administrador tienen acceso completo al sistema, incluida la gestión de usuarios.',
    infoEmployee: 'Las cuentas de empleado pueden crear y gestionar acuerdos de servicio.',
  },
  more: {
    quickActions: 'Acciones rápidas',
    accountInfo: 'Información de la cuenta',
    username: 'Nombre de usuario',
    email: 'Correo electrónico',
    role: 'Rol',
    logoutConfirmTitle: 'Cerrar sesión',
    logoutConfirmMessage: '¿Está seguro de que desea cerrar sesión?',
    actions: {
      myQuota: 'Mi cuota',
      myQuotaDesc: 'Vea el progreso de su cuota',
      myCommissions: 'Mis comisiones',
      myCommissionsDesc: 'Vea sus ganancias por comisiones',
      insideSales: 'Ventas internas',
      insideSalesDesc: 'Consulte su estado de ventas internas',
      insideSalesDescAdmin: 'Consulte el estado de ventas internas',
      employeeCommissions: 'Comisiones de empleados',
      employeeCommissionsDesc: 'Revise las comisiones de todo el equipo',
      adminPanel: 'Panel de administración',
      adminPanelDesc: 'Gestione precios, personal y configuración',
    },
  },
};
