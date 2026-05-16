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
