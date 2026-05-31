export type RootStackParamList = {
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
  // New admin screens
  QuotaManagement: undefined;
  RouteStarCustomers: undefined;
  CompanyMapping: undefined;
  BiginAudit: undefined;
  MapDistance: undefined;
  EmployeeAgreements: undefined;
  EditHistory: undefined;
  PayrollSettings: undefined;
  Payroll: undefined;
};

export type TabParamList = {
  Home: undefined;
  New: undefined;
  Saved: undefined;
  Trash: undefined;
  More: undefined;
  // Admin tabs
  Dashboard: undefined;
  Approvals: undefined;
  Pricing: undefined;
  History: undefined;
  Employees: undefined;
  Admin: undefined;
};
