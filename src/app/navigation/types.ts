export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Main: undefined;
  AdminLogin: undefined;
  AdminPanel: undefined;
  Agreement: undefined;
  Trash: undefined;
  EditAgreement: { agreementId: string };
  MyCommissions: undefined;
  AdminCommissions: undefined;
  AdminCommissionRules: undefined;
  MyQuota: undefined;
  MyInsideSales: undefined;
  
  QuotaManagement: undefined;
  RouteStarCustomers: undefined;
  CompanyMapping: undefined;
  BiginAudit: undefined;
  MapDistance: undefined;
  EmployeeAgreements: undefined;
  EditHistory: undefined;
  PayrollSettings: undefined;
  Payroll: undefined;
  PayrollPeriodDetail: {
    period: {start: string; end: string; label: string};
    isCurrent?: boolean;
  };
  PayrollAgreements: undefined;
  AgreementActivity: undefined;
  UserManagement: undefined;
  EmailTemplate: undefined;
  PdfViewer: {
    url: string;
    title?: string;
    documentId?: string;
    documentType?: 'agreement' | 'version' | 'manual-upload' | 'auto-detect';
    fileName?: string;
  };
};

export type TabParamList = {
  Home: undefined;
  New: undefined;
  Saved: undefined;
  Trash: undefined;
  More: undefined;
  
  Dashboard: undefined;
  Approvals: undefined;
  Pricing: undefined;
  History: undefined;
  Employees: undefined;
  Admin: undefined;
};
