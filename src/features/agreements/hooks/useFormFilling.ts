import {useState, useCallback, useEffect} from 'react';
import {
  FormPayload,
  HeaderRow,
  GlobalSummary,
  CommissionData,
  ServiceAgreementData,
  DEFAULT_HEADER_ROWS,
  formApi,
} from '../../../services/api/endpoints/form.api';
import {normalizeEditServices} from '../utils/serviceDataTransformers';
import {serviceToBackendFormat} from '../utils/serviceToBackend';
import {hasPriceChanges, getPriceChangeCount, createVersionLogFile, trackProductChange, clearPriceChanges} from '../utils/fileLogger';
import {useAuth} from '../../admin/context/AdminAuthContext';
import {computeGlobalCommission} from './useServiceCommission';
import {resolveCommissionRules, type ResolvedCommissionRules} from '../../admin/types/commission.types';
import {commissionApi} from '../../../services/api/endpoints/commission.api';
import {companyMappingApi} from '../../../services/api/endpoints/companyMapping.api';
import {useQuotaContext} from '../context/QuotaContext';

export interface SmallProduct {
  id: string;
  displayName: string;
  qty: number;
  unitPrice: number;
  frequency: string;
  costType?: 'productCost' | 'warranty';
}

export interface BigProduct {
  id: string;
  displayName: string;
  qty: number;
  amount: number;
  frequency: string;
}

export interface Dispenser {
  id: string;
  displayName: string;
  qty: number;
  warrantyRate: number;
  replacementRate: number;
  frequency: string;
  costType?: 'productCost' | 'warranty';
}

export type FormStep = 1 | 2 | 3 | 4 | 5 | 6;

export type PaymentOption = 'online' | 'cash' | 'others';

import type {AccountTypeCache} from './useAccountTypeDetection';

export interface FormState {
  step: FormStep;
  headerTitle: string;
  headerRows: HeaderRow[];
  smallProducts: SmallProduct[];
  bigProducts: BigProduct[];
  dispensers: Dispenser[];
  contractMonths: number;
  startDate: string;
  tripCharge: number;
  tripChargeFrequency: number;
  parkingCharge: number;
  parkingChargeFrequency: number;
  paymentOption: PaymentOption;
  paymentNote: string;
  includeProductsTable: boolean;
  visibleServices: string[];
  services: Record<string, any>;
  enviroOf: string;
  serviceAgreement: ServiceAgreementData;
  pricingConfigs: Record<string, any>;
  productCatalog: any | null;
  serviceConfigsList: any[];
  initialLoading: boolean;
  saving: boolean;
  saveError: string | null;
  savedId: string | null;
  
  biginCompanyId: string | null;
  isConnectedToBigin: boolean;
  
  accountTypeCache: AccountTypeCache | null;
  accountTypeCacheLoadedFromSaved: boolean;
  loadedPriorQuotaCredit: number | null;
  loadedQuotaCredit: number | null;
  loadedCommission: CommissionData | null;
  loadedCommissionRules: ResolvedCommissionRules | null;
}

const DEFAULT_SERVICE_AGREEMENT: ServiceAgreementData = {
  includeInPdf: true,
  retainDispensers: false,
  disposeDispensers: false,
  term1: '',
  term2: '',
  term3: '',
  term4: '',
  term5: '',
  term6: '',
  term7: '',
  noteText: '',
  titleText: 'SERVICE AGREEMENT',
  subtitleText: 'Terms and Conditions',
};

const INITIAL_STATE: FormState = {
  step: 1,
  headerTitle: '',
  headerRows: DEFAULT_HEADER_ROWS,
  smallProducts: [],
  bigProducts: [],
  dispensers: [],
  contractMonths: 36,
  startDate: '',
  tripCharge: 0,
  tripChargeFrequency: 1,
  parkingCharge: 0,
  parkingChargeFrequency: 1,
  paymentOption: 'online',
  paymentNote: '',
  includeProductsTable: true,
  visibleServices: [],
  services: {},
  enviroOf: '',
  serviceAgreement: DEFAULT_SERVICE_AGREEMENT,
  pricingConfigs: {},
  productCatalog: null,
  serviceConfigsList: [],
  initialLoading: false,
  saving: false,
  saveError: null,
  savedId: null,
  biginCompanyId: null,
  isConnectedToBigin: false,
  accountTypeCache: null,
  accountTypeCacheLoadedFromSaved: false,
  loadedPriorQuotaCredit: null,
  loadedQuotaCredit: null,
  loadedCommission: null,
  loadedCommissionRules: null,
};

export function useFormFilling(editAgreementId?: string) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const {user} = useAuth();
  const salespersonId = user?.id ?? 'salesperson_001';
  const salespersonName = user?.fullName ?? user?.username ?? 'Sales Person';

  const {baseCommissionRate, quotaLevelData} = useQuotaContext();
  // Frozen "prior" weekly quota credit (stored value on reopen, else live).
  const effectivePriorQuotaCredit =
    form.loadedPriorQuotaCredit != null
      ? form.loadedPriorQuotaCredit
      : quotaLevelData?.actualSales ?? 0;
  const [activeRules, setActiveRules] = useState<ResolvedCommissionRules>(() =>
    resolveCommissionRules(null),
  );
  // Commission rules (quota target, tier rates, multipliers, deductions, pricing
  // tiers …) are frozen at first calculation and stored with the agreement. A
  // saved/reopened agreement keeps that snapshot so later admin rule changes
  // never retroactively alter an already-created agreement; a new agreement uses
  // the live active rules.
  const effectiveCommissionRules =
    form.loadedCommissionRules != null ? form.loadedCommissionRules : activeRules;

  // Commission/quota only count once the Bigin company is mapped to a RouteStar
  // customer. Bigin-connected-but-unmapped agreements must NOT be calculated.
  const [isRouteStarMapped, setIsRouteStarMapped] = useState<boolean>(false);
  const [payrollLock, setPayrollLock] = useState<{addedToPayroll?: boolean; periodLabel?: string} | null>(null);
  const [isNewLocation, setIsNewLocation] = useState<boolean>(true);
  const [isLocationTypeAuto, setIsLocationTypeAuto] = useState<boolean>(false);
  useEffect(() => {
    let cancelled = false;
    const biginId = form.biginCompanyId;
    if (!biginId) {
      setIsRouteStarMapped(false);
      setIsLocationTypeAuto(false);
      return;
    }
    companyMappingApi
      .getStatusByBigin(biginId)
      .then(status => {
        if (cancelled) return;
        setIsRouteStarMapped(!!status?.isMapped);
        if (status) {
          setIsNewLocation(!status.isExistingLocation);
          setIsLocationTypeAuto(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsRouteStarMapped(false);
          setIsLocationTypeAuto(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [form.biginCompanyId]);

  const [fetchedPriorFarRedline, setFetchedPriorFarRedline] = useState<number>(0);
  const [fetchedPriorFarGreenline, setFetchedPriorFarGreenline] = useState<number>(0);
  useEffect(() => {
    let cancelled = false;
    const biginId = form.biginCompanyId;
    if (!biginId) {
      setFetchedPriorFarRedline(0);
      setFetchedPriorFarGreenline(0);
      return;
    }
    companyMappingApi
      .getPriorFarByBigin(biginId, form.savedId || undefined)
      .then(prior => {
        if (cancelled || !prior) return;
        setFetchedPriorFarRedline(Number(prior.redline) || 0);
        setFetchedPriorFarGreenline(Number(prior.greenline) || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [form.biginCompanyId, form.savedId]);
  const loadedFar = form.loadedCommission as any;
  const priorFarRedline =
    typeof loadedFar?.priorFarRedline === 'number' ? loadedFar.priorFarRedline : fetchedPriorFarRedline;
  const priorFarGreenline =
    typeof loadedFar?.priorFarGreenline === 'number' ? loadedFar.priorFarGreenline : fetchedPriorFarGreenline;

  useEffect(() => {
    let cancelled = false;
    commissionApi
      .getActiveRules()
      .then(loaded => {
        if (cancelled || !loaded) return;
        setActiveRules(resolveCommissionRules(loaded));
      })
      .catch(err => {
        console.error('[RULES] useFormFilling failed to load active rules:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setForm(prev => ({...prev, initialLoading: true}));
    // Start each create/edit session with a clean price-change log.
    clearPriceChanges();

    console.log('[FormFilling] Starting initial API load...', editAgreementId ? `editMode=${editAgreementId}` : 'createMode');

    const apiCalls: Promise<any>[] = [
      formApi.getAdminHeaders(),       
      formApi.getAllServicePricing(),   
      formApi.getProductCatalog(),     
      formApi.getAllServiceConfigs(),   
    ];
    if (editAgreementId) {
      apiCalls.push(formApi.getAgreementForEdit(editAgreementId)); 
    }

    Promise.allSettled(apiCalls).then(([adminRes, pricingRes, catalogRes, svcConfigsRes, editRes]) => {

      if (adminRes.status === 'fulfilled') {
        console.log('[FormFilling][1] Admin Headers OK:', adminRes.value
          ? `id=${adminRes.value._id}, title="${adminRes.value.headerTitle}"`
          : 'null (no active header found)');
      } else {
        console.warn('[FormFilling][1] Admin Headers FAILED:', adminRes.reason);
      }

      if (pricingRes.status === 'fulfilled') {
        const val = pricingRes.value;
        console.log('[FormFilling][2] Service Pricing OK:', val
          ? `${val.serviceConfigs?.length ?? 0} configs, template=${val.serviceAgreementTemplate ? 'yes' : 'no'}`
          : 'null');
      } else {
        console.warn('[FormFilling][2] Service Pricing FAILED:', pricingRes.reason);
      }

      if (catalogRes.status === 'fulfilled') {
        const val = catalogRes.value;
        const familyCount = val?.families?.length ?? 0;
        const productCount = val?.families?.reduce((s: number, f: any) => s + (f.products?.length ?? 0), 0) ?? 0;
        console.log('[FormFilling][3] Product Catalog OK:', val
          ? `${familyCount} families, ${productCount} products`
          : 'null');
      } else {
        console.warn('[FormFilling][3] Product Catalog FAILED:', catalogRes.reason);
      }

      if (svcConfigsRes.status === 'fulfilled') {
        console.log('[FormFilling][4] Service Configs OK:', Array.isArray(svcConfigsRes.value)
          ? `${svcConfigsRes.value.length} configs`
          : 'null');
      } else {
        console.warn('[FormFilling][4] Service Configs FAILED:', svcConfigsRes.reason);
      }

      if (editRes) {
        if (editRes.status === 'fulfilled') {
          console.log('[FormFilling][5] Edit Agreement OK:', editRes.value ? `id=${editRes.value._id}` : 'null');
        } else {
          console.warn('[FormFilling][5] Edit Agreement FAILED:', (editRes as PromiseRejectedResult).reason);
        }
      }

      setForm(prev => {
        const next: FormState = {...prev, initialLoading: false};

        if (adminRes.status === 'fulfilled' && adminRes.value) {
          const ah = adminRes.value;
          if (ah.headerTitle) {
            next.headerTitle = ah.headerTitle;
          }
          if (Array.isArray(ah.headerRows) && ah.headerRows.length > 0) {
            next.headerRows = ah.headerRows;
          }
          if (ah.agreement?.enviroOf) {
            next.enviroOf = ah.agreement.enviroOf;
          }
        }

        if (!editAgreementId && catalogRes.status === 'fulfilled' && catalogRes.value) {
          const catalog = catalogRes.value;
          const allProducts: any[] = (catalog.families ?? []).flatMap((f: any) =>
            (f.products ?? []),
          );
          const ts = Date.now();

          const catalogSmall = allProducts.filter(
            p => p.familyKey !== 'dispensers' && p.displayByAdmin !== false,
          );
          if (catalogSmall.length > 0) {
            next.smallProducts = catalogSmall.map((p: any, i: number) => ({
              id: `sp_${ts}_${i}`,
              displayName: p.name ?? '',
              qty: 0,
              unitPrice: p.basePrice?.amount ?? 0,
              frequency: p.frequency ?? 'monthly',
              costType: 'productCost' as const,
            }));
            console.log('[FormFilling] Pre-populated', next.smallProducts.length, 'products from catalog');
          }

          const catalogDispensers = allProducts.filter(
            p => p.familyKey === 'dispensers' && p.displayByAdmin !== false,
          );
          if (catalogDispensers.length > 0) {
            next.dispensers = catalogDispensers.map((d: any, i: number) => ({
              id: `dp_${ts}_${i}`,
              displayName: d.name ?? '',
              qty: 0,
              warrantyRate: d.warrantyPricePerUnit?.amount ?? 0,
              replacementRate: d.basePrice?.amount ?? 0,
              frequency: d.frequency ?? 'monthly',
              costType: 'productCost' as const,
            }));
            console.log('[FormFilling] Pre-populated', next.dispensers.length, 'dispensers from catalog');
          }
        }

        if (pricingRes.status === 'fulfilled' && pricingRes.value) {
          const {serviceConfigs, serviceAgreementTemplate} = pricingRes.value;

          const SERVICE_ID_ALIASES: Record<string, string> = {
            carpetCleaning: 'carpetclean',
            stripWax:       'stripwax',
            pureJanitorial: 'janitorial', 
          };

          const map: Record<string, any> = {};
          serviceConfigs.forEach((sc: any) => {
            if (sc.serviceId) {
              map[sc.serviceId] = sc;                      
              const alias = SERVICE_ID_ALIASES[sc.serviceId];
              if (alias) {map[alias] = sc;}                
            }
          });
          next.pricingConfigs = map;

          if (serviceAgreementTemplate) {
            next.serviceAgreement = {
              ...next.serviceAgreement,
              term1:       serviceAgreementTemplate.term1       ?? '',
              term2:       serviceAgreementTemplate.term2       ?? '',
              term3:       serviceAgreementTemplate.term3       ?? '',
              term4:       serviceAgreementTemplate.term4       ?? '',
              term5:       serviceAgreementTemplate.term5       ?? '',
              term6:       serviceAgreementTemplate.term6       ?? '',
              term7:       serviceAgreementTemplate.term7       ?? '',
              noteText:    serviceAgreementTemplate.noteText    ?? '',
              titleText:   serviceAgreementTemplate.titleText   ?? 'SERVICE AGREEMENT',
              subtitleText: serviceAgreementTemplate.subtitleText ?? 'Terms and Conditions',
            };
          }
        }

        if (catalogRes.status === 'fulfilled' && catalogRes.value) {
          next.productCatalog = catalogRes.value;
        }

        if (svcConfigsRes.status === 'fulfilled' && svcConfigsRes.value) {
          next.serviceConfigsList = svcConfigsRes.value;
        }

        if (editRes && editRes.status === 'fulfilled' && editRes.value) {
          const doc = editRes.value;
          // Edit-format may return content at top level OR nested under `payload`
          // (matches web: `const fromBackend = json.payload ?? json`).
          const payload = doc.payload ?? doc;
          const ts = Date.now();

          next.savedId = doc._id ?? doc.id ?? editAgreementId!;
          setPayrollLock(doc.payrollLock || null);

          if (doc.biginCompanyId) {
            next.biginCompanyId = doc.biginCompanyId;
          }
          if (typeof doc.isConnectedToBigin === 'boolean') {
            next.isConnectedToBigin = doc.isConnectedToBigin;
          }
          console.log('[BIGIN-EDIT] Loaded connection from edit-format →', {
            isConnectedToBigin: doc.isConnectedToBigin,
            biginCompanyId: doc.biginCompanyId,
            zohoMapping: doc.zohoMapping,
          });

          if (doc.accountTypeCache && typeof doc.accountTypeCache === 'object' && Object.keys(doc.accountTypeCache).length > 0) {
            next.accountTypeCache = doc.accountTypeCache;
            next.accountTypeCacheLoadedFromSaved = true;
            console.log('[FormFilling] Loaded accountTypeCache from saved agreement, keys:', Object.keys(doc.accountTypeCache));
          } else {
            console.log('[FormFilling] No accountTypeCache in saved agreement');
          }

          const editTitle = payload.headerTitle ?? doc.headerTitle;
          const editRows = payload.headerRows ?? doc.headerRows;
          if (editTitle) {next.headerTitle = editTitle;}
          if (Array.isArray(editRows) && editRows.length > 0) {next.headerRows = editRows;}

          const savedProducts = payload.products ?? {};
          const productName = (p: any) =>
            p.displayName || p.customName || p.productName || p.productKey || '';
          const toNum = (v: any) => {
            const n = parseFloat(String(v ?? ''));
            return Number.isFinite(n) ? n : 0;
          };
          const toInt = (v: any) => {
            const n = parseInt(String(v ?? ''), 10);
            return Number.isFinite(n) ? n : 0;
          };

          // In edit mode products come ENTIRELY from the saved agreement (no
          // catalog defaults). Mirror the web app's `extractProductsFromBackend`
          // which accepts three shapes: merged products[], legacy 3 arrays, rows[].
          const editSmall: any[] = [];
          const editBig: any[] = [];
          const editDispensers: any[] = [];

          if (Array.isArray(savedProducts.products)) {
            savedProducts.products.forEach((p: any, i: number) => {
              const isSmall = p._productType ? p._productType === 'small' : p.unitPrice != null;
              if (isSmall) {
                editSmall.push({
                  id: `edit_sp_${ts}_${i}`,
                  displayName: productName(p),
                  qty: toInt(p.qty) || 1,
                  unitPrice: toNum(p.unitPrice ?? p.amount),
                  frequency: p.frequency || 'monthly',
                  costType: p.costType ?? 'productCost',
                });
              } else {
                editBig.push({
                  id: `edit_bp_${ts}_${i}`,
                  displayName: productName(p),
                  qty: toInt(p.qty) || 1,
                  amount: toNum(p.amount ?? p.unitPrice),
                  frequency: p.frequency || 'monthly',
                });
              }
            });
            (savedProducts.dispensers ?? []).forEach((d: any, i: number) => {
              editDispensers.push({
                id: `edit_dp_${ts}_${i}`,
                displayName: productName(d),
                qty: toInt(d.qty) || 1,
                warrantyRate: toNum(d.warrantyRate),
                replacementRate: toNum(d.replacementRate),
                frequency: d.frequency || 'monthly',
                costType: d.costType ?? 'productCost',
              });
            });
          } else if (
            Array.isArray(savedProducts.smallProducts) ||
            Array.isArray(savedProducts.dispensers) ||
            Array.isArray(savedProducts.bigProducts)
          ) {
            (savedProducts.smallProducts ?? []).forEach((p: any, i: number) => {
              editSmall.push({
                id: `edit_sp_${ts}_${i}`,
                displayName: productName(p),
                qty: toInt(p.qty ?? p.quantity) || 1,
                unitPrice: toNum(p.unitPrice ?? p.amount),
                frequency: p.frequency || 'monthly',
                costType: p.costType ?? 'productCost',
              });
            });
            (savedProducts.bigProducts ?? []).forEach((p: any, i: number) => {
              editBig.push({
                id: `edit_bp_${ts}_${i}`,
                displayName: productName(p),
                qty: toInt(p.qty ?? p.quantity) || 1,
                amount: toNum(p.amount ?? p.unitPrice),
                frequency: p.frequency || 'monthly',
              });
            });
            (savedProducts.dispensers ?? []).forEach((d: any, i: number) => {
              editDispensers.push({
                id: `edit_dp_${ts}_${i}`,
                displayName: productName(d),
                qty: toInt(d.qty ?? d.quantity) || 1,
                warrantyRate: toNum(d.warrantyRate),
                replacementRate: toNum(d.replacementRate),
                frequency: d.frequency || 'monthly',
                costType: d.costType ?? 'productCost',
              });
            });
          } else if (Array.isArray(savedProducts.rows)) {
            // Row-matrix format: [small(0-4)] [dispenser(5-10)] [big(11-15)]
            savedProducts.rows.forEach((row: any[], i: number) => {
              if (row[0] && String(row[0]).trim() !== '') {
                editSmall.push({
                  id: `edit_sp_${ts}_${i}`,
                  displayName: row[0],
                  unitPrice: toNum(row[1]),
                  frequency: row[2] || 'monthly',
                  qty: toInt(row[3]) || 1,
                  costType: 'productCost',
                });
              }
              if (row[5] && String(row[5]).trim() !== '') {
                editDispensers.push({
                  id: `edit_dp_${ts}_${i}`,
                  displayName: row[5],
                  qty: toInt(row[6]) || 1,
                  warrantyRate: toNum(row[7]),
                  replacementRate: toNum(row[8]),
                  frequency: row[9] || 'monthly',
                  costType: 'productCost',
                });
              }
              if (row[11] && String(row[11]).trim() !== '') {
                editBig.push({
                  id: `edit_bp_${ts}_${i}`,
                  displayName: row[11],
                  qty: toInt(row[12]) || 1,
                  amount: toNum(row[13]),
                  frequency: row[14] || 'monthly',
                });
              }
            });
          }

          // Always replace (even with empty arrays) so nothing leaks from defaults.
          next.smallProducts = editSmall;
          next.bigProducts = editBig;
          next.dispensers = editDispensers;
          console.log('[FormFilling] Edit products loaded — small:', editSmall.length, 'big:', editBig.length, 'dispensers:', editDispensers.length);
          console.log('[FormFilling] Raw products keys:', Object.keys(savedProducts), '| products[]:', Array.isArray(savedProducts.products) ? savedProducts.products.length : 'n/a', '| dispensers[]:', Array.isArray(savedProducts.dispensers) ? savedProducts.dispensers.length : 'n/a', '| smallProducts[]:', Array.isArray(savedProducts.smallProducts) ? savedProducts.smallProducts.length : 'n/a', '| bigProducts[]:', Array.isArray(savedProducts.bigProducts) ? savedProducts.bigProducts.length : 'n/a', '| rows[]:', Array.isArray(savedProducts.rows) ? savedProducts.rows.length : 'n/a');
          console.log('[FormFilling] Raw products sample:', JSON.stringify(savedProducts).slice(0, 1000));

          if (payload.services && typeof payload.services === 'object') {
            next.services = normalizeEditServices(payload.services);
            // Only services that were actually added show in edit mode. Inactive
            // services are saved as null (or {isActive:false}) by the web app —
            // exclude both; a real added service is a truthy object not marked inactive.
            next.visibleServices = Object.keys(payload.services).filter(k => {
              const s = payload.services[k];
              return !!s && typeof s === 'object' && s.isActive !== false;
            });
            console.log('[FormFilling] Edit visible services:', next.visibleServices);
          }

          const savedSummary = payload.summary ?? {};
          if (typeof savedSummary.contractMonths === 'number') {next.contractMonths = savedSummary.contractMonths;}
          if (typeof savedSummary.tripCharge === 'number') {next.tripCharge = savedSummary.tripCharge;}
          if (typeof savedSummary.tripChargeFrequency === 'number') {next.tripChargeFrequency = savedSummary.tripChargeFrequency;}
          if (typeof savedSummary.parkingCharge === 'number') {next.parkingCharge = savedSummary.parkingCharge;}
          if (typeof savedSummary.parkingChargeFrequency === 'number') {next.parkingChargeFrequency = savedSummary.parkingChargeFrequency;}
          if (typeof savedSummary.priorQuotaCredit === 'number') {next.loadedPriorQuotaCredit = savedSummary.priorQuotaCredit;}
          if (typeof savedSummary.quotaCredit === 'number') {next.loadedQuotaCredit = savedSummary.quotaCredit;}
          if (payload.commission) {next.loadedCommission = payload.commission;}
          if (payload.commission?.rulesSnapshot && typeof payload.commission.rulesSnapshot === 'object') {
            next.loadedCommissionRules = resolveCommissionRules(payload.commission.rulesSnapshot);
          }

          const savedAgreement = payload.agreement ?? {};
          if (savedAgreement.enviroOf) {next.enviroOf = savedAgreement.enviroOf;}
          if (savedAgreement.paymentOption) {next.paymentOption = savedAgreement.paymentOption;}
          if (typeof savedAgreement.paymentNote === 'string') {next.paymentNote = savedAgreement.paymentNote;}
          if (savedAgreement.startDate) {next.startDate = savedAgreement.startDate;}

          if (payload.serviceAgreement && typeof payload.serviceAgreement === 'object') {
            next.serviceAgreement = {...DEFAULT_SERVICE_AGREEMENT, ...payload.serviceAgreement};
          }
          if (typeof payload.includeProductsTable === 'boolean') {
            next.includeProductsTable = payload.includeProductsTable;
          }

          console.log('[FormFilling] Edit mode populated — services:', Object.keys(next.services), '| contractMonths:', next.contractMonths);
        }

        console.log('[FormFilling] State updated — pricingConfigs keys:', Object.keys(next.pricingConfigs));
        return next;
      });
    });
  }, [editAgreementId]);

  const goToStep = useCallback((step: FormStep) => {
    setForm(prev => ({...prev, step}));
  }, []);

  const nextStep = useCallback(() => {
    setForm(prev => ({...prev, step: Math.min(6, prev.step + 1) as FormStep}));
  }, []);

  const prevStep = useCallback(() => {
    setForm(prev => ({...prev, step: Math.max(1, prev.step - 1) as FormStep}));
  }, []);

  const setHeaderTitle = useCallback((headerTitle: string) => {
    setForm(prev => ({...prev, headerTitle}));
  }, []);

  const setHeaderRow = useCallback((index: number, field: keyof HeaderRow, value: string) => {
    setForm(prev => {
      const rows = [...prev.headerRows];
      rows[index] = {...rows[index], [field]: value};
      return {...prev, headerRows: rows};
    });
  }, []);

  const addSmallProduct = useCallback(() => {
    const item: SmallProduct = {
      id: Date.now().toString(),
      displayName: '',
      qty: 1,
      unitPrice: 0,
      frequency: 'monthly',
      costType: 'productCost',
    };
    setForm(prev => ({...prev, smallProducts: [...prev.smallProducts, item]}));
  }, []);

  const removeSmallProduct = useCallback((id: string) => {
    setForm(prev => ({...prev, smallProducts: prev.smallProducts.filter(p => p.id !== id)}));
  }, []);

  const updateSmallProduct = useCallback((id: string, data: Partial<SmallProduct>) => {
    setForm(prev => {
      const old = prev.smallProducts.find(p => p.id === id);
      if (old) {
        if (data.unitPrice !== undefined) {
          trackProductChange('product', old.displayName || 'Product', 'unitPrice', old.unitPrice, Number(data.unitPrice), {
            quantity: data.qty ?? old.qty,
            frequency: data.frequency ?? old.frequency,
          });
        }
      }
      return {...prev, smallProducts: prev.smallProducts.map(p => (p.id === id ? {...p, ...data} : p))};
    });
  }, []);

  const addBigProduct = useCallback(() => {
    const item: BigProduct = {
      id: Date.now().toString(),
      displayName: '',
      qty: 1,
      amount: 0,
      frequency: 'monthly',
    };
    setForm(prev => ({...prev, bigProducts: [...prev.bigProducts, item]}));
  }, []);

  const removeBigProduct = useCallback((id: string) => {
    setForm(prev => ({...prev, bigProducts: prev.bigProducts.filter(p => p.id !== id)}));
  }, []);

  const updateBigProduct = useCallback((id: string, data: Partial<BigProduct>) => {
    setForm(prev => {
      const old = prev.bigProducts.find(p => p.id === id);
      if (old && data.amount !== undefined) {
        trackProductChange('product', old.displayName || 'Product', 'amount', old.amount, Number(data.amount), {
          quantity: data.qty ?? old.qty,
          frequency: data.frequency ?? old.frequency,
        });
      }
      return {...prev, bigProducts: prev.bigProducts.map(p => (p.id === id ? {...p, ...data} : p))};
    });
  }, []);

  const addDispenser = useCallback(() => {
    const item: Dispenser = {
      id: Date.now().toString(),
      displayName: '',
      qty: 1,
      warrantyRate: 0,
      replacementRate: 0,
      frequency: 'monthly',
      costType: 'productCost',
    };
    setForm(prev => ({...prev, dispensers: [...prev.dispensers, item]}));
  }, []);

  const removeDispenser = useCallback((id: string) => {
    setForm(prev => ({...prev, dispensers: prev.dispensers.filter(d => d.id !== id)}));
  }, []);

  const updateDispenser = useCallback((id: string, data: Partial<Dispenser>) => {
    setForm(prev => {
      const old = prev.dispensers.find(d => d.id === id);
      if (old) {
        if (data.warrantyRate !== undefined) {
          trackProductChange('dispenser', old.displayName || 'Dispenser', 'warrantyRate', old.warrantyRate, Number(data.warrantyRate), {
            quantity: data.qty ?? old.qty,
            frequency: data.frequency ?? old.frequency,
          });
        }
        if (data.replacementRate !== undefined) {
          trackProductChange('dispenser', old.displayName || 'Dispenser', 'replacementRate', old.replacementRate, Number(data.replacementRate), {
            quantity: data.qty ?? old.qty,
            frequency: data.frequency ?? old.frequency,
          });
        }
      }
      return {...prev, dispensers: prev.dispensers.map(d => (d.id === id ? {...d, ...data} : d))};
    });
  }, []);

  const setContractMonths = useCallback((contractMonths: number) => {
    setForm(prev => ({...prev, contractMonths}));
  }, []);

  const setStartDate = useCallback((startDate: string) => {
    setForm(prev => ({...prev, startDate}));
  }, []);

  const setTripCharge = useCallback((tripCharge: number) => {
    setForm(prev => ({...prev, tripCharge}));
  }, []);

  const setTripChargeFrequency = useCallback((tripChargeFrequency: number) => {
    setForm(prev => ({...prev, tripChargeFrequency}));
  }, []);

  const setParkingCharge = useCallback((parkingCharge: number) => {
    setForm(prev => ({...prev, parkingCharge}));
  }, []);

  const setParkingChargeFrequency = useCallback((parkingChargeFrequency: number) => {
    setForm(prev => ({...prev, parkingChargeFrequency}));
  }, []);

  const setPaymentOption = useCallback((paymentOption: PaymentOption) => {
    setForm(prev => ({...prev, paymentOption}));
  }, []);

  const setPaymentNote = useCallback((paymentNote: string) => {
    setForm(prev => ({...prev, paymentNote}));
  }, []);

  const setIncludeProductsTable = useCallback((includeProductsTable: boolean) => {
    setForm(prev => ({...prev, includeProductsTable}));
  }, []);

  const addService = useCallback((serviceId: string) => {
    setForm(prev => {
      if (prev.visibleServices.includes(serviceId)) {return prev;}
      return {...prev, visibleServices: [...prev.visibleServices, serviceId]};
    });
  }, []);

  const removeService = useCallback((serviceId: string) => {
    setForm(prev => ({
      ...prev,
      visibleServices: prev.visibleServices.filter(s => s !== serviceId),
      services: Object.fromEntries(
        Object.entries(prev.services).filter(([k]) => k !== serviceId),
      ),
    }));
  }, []);

  const updateService = useCallback((serviceId: string, data: any) => {
    setForm(prev => ({
      ...prev,
      services: {...prev.services, [serviceId]: data},
    }));
  }, []);

  const setEnviroOf = useCallback((enviroOf: string) => {
    setForm(prev => ({...prev, enviroOf}));
  }, []);

  const updateServiceAgreement = useCallback((data: Partial<ServiceAgreementData>) => {
    setForm(prev => ({
      ...prev,
      serviceAgreement: {...prev.serviceAgreement, ...data},
    }));
  }, []);

  const buildPayload = useCallback((): FormPayload => {
    const activeServices: Record<string, any> = {};
    for (const id of form.visibleServices) {
      if (form.services[id]) {
        // Save each service in the web app's structured shape (with flat fields
        // kept) so it round-trips on mobile AND opens correctly on the web app.
        activeServices[id] = serviceToBackendFormat(id, form.services[id]);
      }
    }

    const hasServiceNotes = Object.values(activeServices).some(
      (sd: any) => sd?.isActive && typeof sd.notes === 'string' && sd.notes.trim().length > 0,
    );

    const totalCurrentContract = Object.values(activeServices).reduce(
      (sum: number, sd: any) => sum + (sd?.isActive ? (Number(sd.contractTotal) || 0) : 0),
      0,
    );
    const totalOriginalContract = Object.values(activeServices).reduce(
      (sum: number, sd: any) => sum + (sd?.isActive ? (Number(sd.originalContractTotal) || 0) : 0),
      0,
    );

    const documentStatus =
      hasServiceNotes || totalOriginalContract > totalCurrentContract
        ? 'pending_approval'
        : 'saved';

    // The effective (frozen-aware) prior weekly quota credit is computed at the
    // hook level so display and save stay consistent.
    const commissionResult = computeGlobalCommission(
      form.services,
      form.accountTypeCache ?? {},
      form.contractMonths,
      baseCommissionRate,
      effectiveCommissionRules,
      effectivePriorQuotaCredit,
      isNewLocation,
      priorFarRedline,
      priorFarGreenline,
    );
    const years = form.contractMonths > 0 ? form.contractMonths / 12 : 1;
    // Commission/quota only count once the Bigin company is mapped to a RouteStar
    // customer. Bigin-connected-but-unmapped agreements must NOT be calculated.
    const canCalculate = !!form.biginCompanyId && isRouteStarMapped;
    // Previously-saved commission is still preserved so a draft re-save never wipes it.
    const hasBiginCommission = canCalculate || !!form.loadedCommission;
    const commission: CommissionData | null = canCalculate
      ? {
          weeklyCommission:
            commissionResult.totalAnnualCommission / effectiveCommissionRules.weeksPerAnnualCommission,
          annualCommission: commissionResult.totalAnnualCommission,
          contractCommission: commissionResult.totalAnnualCommission * years,
          finalCommissionRate: commissionResult.effectiveCommissionRate,
          agreementMultiplier: commissionResult.agreementMultiplier,
          baseRate: baseCommissionRate,
          rulesSnapshot: effectiveCommissionRules,
          serviceBreakdown: commissionResult.services.map(s => ({
            serviceName: s.serviceName,
            accountType: s.accountType,
            perVisitCommission: s.perVisitCommission,
            annualCommission: s.annualCommission,
          })),
        }
      : form.loadedCommission;

    const summary: GlobalSummary = {
      contractMonths: form.contractMonths,
      tripCharge: form.tripCharge,
      tripChargeFrequency: form.tripChargeFrequency,
      parkingCharge: form.parkingCharge,
      parkingChargeFrequency: form.parkingChargeFrequency,
      serviceAgreementTotal: 0,
      productMonthlyTotal: 0,
      productContractTotal: 0,
      quotaCredit: canCalculate
        ? Math.round((commissionResult.totalQuotaCredit || 0) * 100) / 100
        : form.loadedQuotaCredit ?? 0,
      priorQuotaCredit: hasBiginCommission ? effectivePriorQuotaCredit : undefined,
    };

    // Build products in the EXACT web app structure so save/edit round-trips on
    // both apps: a merged `products` array (small w/ unitPrice + big w/ amount),
    // a `dispensers` array, plus raw `smallProducts`/`bigProducts` arrays.
    // Only rows with a quantity > 0 are persisted/printed — zero-qty catalog rows
    // are excluded from the saved payload and the PDF.
    const smallProducts = form.smallProducts.filter(p => p.qty > 0).map(p => ({
      displayName: p.displayName,
      qty: p.qty,
      unitPrice: p.unitPrice,
      frequency: p.frequency,
      costType: p.costType ?? 'productCost',
      total: p.qty * p.unitPrice,
      customFields: {},
    }));
    const bigProducts = form.bigProducts.filter(p => p.qty > 0).map(p => ({
      displayName: p.displayName,
      qty: p.qty,
      amount: p.amount,
      frequency: p.frequency,
      total: p.qty * p.amount,
      customFields: {},
    }));
    const dispensers = form.dispensers.filter(d => d.qty > 0).map(d => ({
      displayName: d.displayName,
      qty: d.qty,
      warrantyRate: d.warrantyRate,
      replacementRate: d.replacementRate,
      frequency: d.frequency,
      costType: d.costType ?? 'productCost',
      total: d.qty * (d.costType === 'warranty' ? d.warrantyRate : d.replacementRate),
      customFields: {},
    }));
    const mergedProducts = [
      ...smallProducts.map(p => ({
        displayName: p.displayName,
        qty: p.qty,
        unitPrice: p.unitPrice,
        frequency: p.frequency,
        total: p.total,
        customFields: {},
      })),
      ...bigProducts.map(b => ({
        displayName: b.displayName,
        qty: b.qty,
        amount: b.amount,
        frequency: b.frequency,
        total: b.total,
        customFields: {},
      })),
    ];

    return {
      headerTitle: form.headerTitle || 'New Agreement',
      headerRows: form.headerRows,
      products: {
        products: mergedProducts,
        dispensers,
        smallProducts,
        bigProducts,
      },
      services: activeServices,
      agreement: {
        enviroOf: form.enviroOf,
        customerExecutedOn: new Date().toISOString(),
        additionalMonths: 0,
        paymentOption: form.paymentOption,
        paymentNote: form.paymentNote,
        startDate: form.startDate,
      },
      serviceAgreement: form.serviceAgreement,
      includeProductsTable: form.includeProductsTable,
      status: documentStatus,
      summary,
      commission,
    };
  }, [form, baseCommissionRate, quotaLevelData, activeRules, effectiveCommissionRules, effectivePriorQuotaCredit, isRouteStarMapped, isNewLocation, priorFarRedline, priorFarGreenline]);

  const saveDraft = useCallback(async (): Promise<{ok: boolean; agreementId: string | null; status: 'saved' | 'pending_approval'}> => {
    setForm(prev => ({...prev, saving: true, saveError: null}));
    const payload = buildPayload();
    const docStatus = (payload.status ?? 'saved') as 'saved' | 'pending_approval';
    let ok = false;
    let agreementId: string | null = form.savedId ?? null;
    if (form.savedId) {
      ok = await formApi.updateAgreement(form.savedId, payload);
    } else {
      const result = await formApi.createAgreement(payload);
      if (result) {
        agreementId = result.id;
        setForm(prev => ({...prev, savedId: result.id}));
        ok = true;
      }
    }
    // Price-change log file (matches web app handleDraft: saveAction 'save_draft').
    if (ok && agreementId && hasPriceChanges()) {
      try {
        await createVersionLogFile({
          agreementId,
          versionId: agreementId,
          versionNumber: 1,
          salespersonId,
          salespersonName,
          saveAction: 'save_draft',
          documentTitle: form.headerTitle || 'Untitled Document',
        });
        console.log('[FormFilling] Draft price-change log created');
      } catch (e) {
        console.warn('[FormFilling] Draft log creation failed:', e);
      }
    }
    setForm(prev => ({
      ...prev,
      saving: false,
      saveError: ok ? null : 'Failed to save. Please try again.',
    }));
    return {ok, agreementId, status: docStatus};
  }, [form.savedId, form.headerTitle, buildPayload, salespersonId, salespersonName]);

  const generate = useCallback(async (): Promise<{ok: boolean; agreementId: string | null; status: 'saved' | 'pending_approval'}> => {
    // "Save & Generate PDF" — mirrors the web app:
    //   1. save the agreement (create new / update existing)
    //   2. createVersion → produces the PDF FILE shown in the agreement folder
    setForm(prev => ({...prev, saving: true, saveError: null}));
    const payload = buildPayload();
    const docStatus = (payload.status ?? 'saved') as 'saved' | 'pending_approval';
    let ok = false;
    let agreementId: string | null = form.savedId ?? null;
    console.log('[FormFilling] Generate PDF — savedId:', form.savedId, 'status:', docStatus);

    if (form.savedId) {
      ok = await formApi.updateAndRecompileAgreement(form.savedId, payload);
    } else {
      const result = await formApi.createAgreement(payload);
      if (result) {
        agreementId = result.id;
        setForm(prev => ({...prev, savedId: result.id}));
        ok = true;
      }
    }

    // Create the version PDF file (what appears in the folder).
    if (ok && agreementId) {
      try {
        const vstatus = await formApi.checkVersionStatus(agreementId);
        const isFirstTime = vstatus?.isFirstTime ?? true;
        const versionResult = await formApi.createVersion(agreementId, {
          changeNotes: isFirstTime ? 'Initial version' : 'Updated version',
          replaceRecent: false,
          isFirstTime,
        });
        console.log('[FormFilling] createVersion result:', versionResult ? 'ok' : 'null', 'isFirstTime:', isFirstTime);
        if (!versionResult) {
          ok = false;
        } else if (hasPriceChanges()) {
          // Price-change log file (matches web app: saveAction 'generate_pdf').
          try {
            const version = versionResult.version ?? {};
            await createVersionLogFile({
              agreementId,
              versionId: version.id ?? version._id ?? agreementId,
              versionNumber: version.versionNumber ?? 1,
              salespersonId,
              salespersonName,
              saveAction: 'generate_pdf',
              documentTitle: form.headerTitle || 'Untitled Document',
            });
            console.log('[FormFilling] Generate price-change log created (', getPriceChangeCount(), 'changes)');
          } catch (logErr) {
            console.warn('[FormFilling] Generate log creation failed:', logErr);
          }
        }
      } catch (e) {
        console.warn('[FormFilling] version creation error:', e);
        ok = false;
      }
    }

    console.log('[FormFilling] Generate PDF result — ok:', ok, 'agreementId:', agreementId);
    setForm(prev => ({
      ...prev,
      saving: false,
      saveError: ok ? null : 'Failed to generate. Please try again.',
    }));
    return {ok, agreementId, status: docStatus};
  }, [form.savedId, form.headerTitle, buildPayload, salespersonId, salespersonName]);

  const reset = useCallback(() => {
    setForm(INITIAL_STATE);
  }, []);

  const allServicesOneTime: boolean = (() => {
    const activeEntries = form.visibleServices
      .map(id => form.services[id])
      .filter(sd => sd?.isActive);
    if (activeEntries.length === 0) {return false;}
    return activeEntries.every(sd => {
      const freq: string =
        sd?.frequency ??
        sd?.frequencyKey ??
        sd?.frequency?.frequencyKey ??
        sd?.frequency?.value ??
        '';
      const normalized = String(freq).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalized === 'onetime' || normalized === '1time';
    });
  })();

  return {
    form,
    payrollLock,
    effectivePriorQuotaCredit,
    effectiveCommissionRules,
    isRouteStarMapped,
    isNewLocation,
    isLocationTypeAuto,
    priorFarRedline,
    priorFarGreenline,
    goToStep,
    nextStep,
    prevStep,
    setHeaderTitle,
    setHeaderRow,
    addSmallProduct,
    removeSmallProduct,
    updateSmallProduct,
    addBigProduct,
    removeBigProduct,
    updateBigProduct,
    addDispenser,
    removeDispenser,
    updateDispenser,
    setContractMonths,
    setStartDate,
    setTripCharge,
    setTripChargeFrequency,
    setParkingCharge,
    setParkingChargeFrequency,
    setPaymentOption,
    setPaymentNote,
    setIncludeProductsTable,
    addService,
    removeService,
    updateService,
    setEnviroOf,
    updateServiceAgreement,
    buildPayload,
    saveDraft,
    generate,
    reset,
    allServicesOneTime,
  };
}
