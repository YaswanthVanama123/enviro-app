import {useState, useCallback} from 'react';
import {pricingApi, ServiceConfig} from '../../../services/api/endpoints/pricing.api';
import {ConfigField, setConfigValue} from '../utils/pricing.utils';

export function useConfigFieldEditor(
  config: ServiceConfig | null,
  onSaved?: (updated: ServiceConfig) => void,
) {
  const [field, setField] = useState<ConfigField | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const open = useCallback((target: ConfigField) => {
    setField(target);
    setValue(target.rawValue === null || target.rawValue === undefined ? '' : String(target.rawValue));
    setError('');
    setSuccess(false);
  }, []);

  const cancel = useCallback(() => {
    setField(null);
    setError('');
    setSuccess(false);
  }, []);

  const changeValue = useCallback((next: string) => {
    setValue(next);
    setError('');
  }, []);

  const save = useCallback(async () => {
    if (!field || !config?._id) {return;}
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid number.');
      return;
    }
    setError('');
    setSaving(true);
    const nextConfig = setConfigValue(config.config, field.path, amount);
    const result = await pricingApi.updateServiceConfigPricing(config._id, nextConfig);
    setSaving(false);
    if (result.ok) {
      setSuccess(true);
      onSaved?.({...config, config: nextConfig});
      setTimeout(() => {
        setField(null);
        setSuccess(false);
      }, 1000);
    } else {
      setError(result.error ?? 'Failed to save. Please try again.');
    }
  }, [field, config, value, onSaved]);

  return {field, value, saving, error, success, open, cancel, changeValue, save};
}
