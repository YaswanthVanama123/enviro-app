import {useState, useCallback, useEffect} from 'react';
import {
  FormPayload,
  HeaderRow,
  GlobalSummary,
  ServiceAgreementData,
  DEFAULT_HEADER_ROWS,
  formApi,
} from '../../../services/api/endpoints/form.api';

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
  contractMonths: 12,
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
};

export function useFormFilling() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  useEffect(() => {
    setForm(prev => ({...prev, initialLoading: true}));

    console.log('[FormFilling] Starting initial API load...');

    Promise.allSettled([
      formApi.getAdminHeaders(),       // [0] header template
      formApi.getAllServicePricing(),   // [1] pricing + service agreement template
      formApi.getProductCatalog(),     // [2] product catalog
      formApi.getAllServiceConfigs(),   // [3] service configs list
    ]).then(([adminRes, pricingRes, catalogRes, svcConfigsRes]) => {

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

        if (catalogRes.status === 'fulfilled' && catalogRes.value) {
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
              qty: 1,
              unitPrice: p.basePrice?.amount ?? 0,
              frequency: p.frequency ?? 'monthly',
              costType: 'warranty' as const,
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
              qty: 1,
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
          };

          const map: Record<string, any> = {};
          serviceConfigs.forEach((sc: any) => {
            if (sc.serviceId) {
              map[sc.serviceId] = sc;                      // original key
              const alias = SERVICE_ID_ALIASES[sc.serviceId];
              if (alias) {map[alias] = sc;}                // aliased key
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

        console.log('[FormFilling] State updated — pricingConfigs keys:', Object.keys(next.pricingConfigs));
        return next;
      });
    });
  }, []);

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
      costType: 'warranty',
    };
    setForm(prev => ({...prev, smallProducts: [...prev.smallProducts, item]}));
  }, []);

  const removeSmallProduct = useCallback((id: string) => {
    setForm(prev => ({...prev, smallProducts: prev.smallProducts.filter(p => p.id !== id)}));
  }, []);

  const updateSmallProduct = useCallback((id: string, data: Partial<SmallProduct>) => {
    setForm(prev => ({
      ...prev,
      smallProducts: prev.smallProducts.map(p => p.id === id ? {...p, ...data} : p),
    }));
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
    setForm(prev => ({
      ...prev,
      bigProducts: prev.bigProducts.map(p => p.id === id ? {...p, ...data} : p),
    }));
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
    setForm(prev => ({
      ...prev,
      dispensers: prev.dispensers.map(d => d.id === id ? {...d, ...data} : d),
    }));
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
        activeServices[id] = form.services[id];
      }
    }

    const hasServiceNotes = Object.values(activeServices).some(
      (sd: any) => sd?.isActive && typeof sd.notes === 'string' && sd.notes.trim().length > 0,
    );
    const documentStatus = hasServiceNotes ? 'pending_approval' : 'saved';

    const summary: GlobalSummary = {
      contractMonths: form.contractMonths,
      tripCharge: form.tripCharge,
      tripChargeFrequency: form.tripChargeFrequency,
      parkingCharge: form.parkingCharge,
      parkingChargeFrequency: form.parkingChargeFrequency,
      serviceAgreementTotal: 0,
      productMonthlyTotal: 0,
      productContractTotal: 0,
    };

    return {
      headerTitle: form.headerTitle || 'New Agreement',
      headerRows: form.headerRows,
      products: {
        smallProducts: form.smallProducts.map(p => ({
          displayName: p.displayName,
          qty: p.qty,
          unitPrice: p.unitPrice,
          frequency: p.frequency,
          costType: p.costType ?? 'warranty',
          total: p.qty * p.unitPrice,
        })),
        bigProducts: form.bigProducts.map(p => ({
          displayName: p.displayName,
          qty: p.qty,
          amount: p.amount,
          frequency: p.frequency,
          total: p.qty * p.amount,
        })),
        dispensers: form.dispensers.map(d => ({
          displayName: d.displayName,
          qty: d.qty,
          warrantyRate: d.warrantyRate,
          replacementRate: d.replacementRate,
          frequency: d.frequency,
          costType: d.costType ?? 'productCost',
          total: d.qty * (d.costType === 'warranty' ? d.warrantyRate : d.replacementRate),
        })),
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
    };
  }, [form]);

  const saveDraft = useCallback(async (): Promise<boolean> => {
    setForm(prev => ({...prev, saving: true, saveError: null}));
    const payload = buildPayload();
    let ok = false;
    if (form.savedId) {
      ok = await formApi.updateAgreement(form.savedId, payload);
    } else {
      const result = await formApi.createAgreement(payload);
      if (result) {
        setForm(prev => ({...prev, savedId: result.id}));
        ok = true;
      }
    }
    setForm(prev => ({
      ...prev,
      saving: false,
      saveError: ok ? null : 'Failed to save. Please try again.',
    }));
    return ok;
  }, [form.savedId, buildPayload]);

  const generate = useCallback(async (): Promise<boolean> => {
    return saveDraft();
  }, [saveDraft]);

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
