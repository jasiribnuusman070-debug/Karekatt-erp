import { useState, useEffect } from 'react';
import api from '../api';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const TEMPLATE_VARS = ['{customer_name}', '{order_id}', '{job_type}', '{total_amount}'];

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Settings</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">WhatsApp templates, quotation settings, and preferences.</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* WhatsApp */}
        <div className="card lg:col-span-2">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">WhatsApp Notifications</span>
          </div>
          <div className="p-md flex flex-col gap-md">
            <div className="flex items-center justify-between p-sm bg-surface-container rounded-lg">
              <div>
                <p className="text-label-md text-on-surface font-semibold">Enable WhatsApp</p>
                <p className="text-label-sm text-on-surface-variant">Show WA links on order actions</p>
              </div>
              <button
                onClick={() => set('wa_enabled', settings.wa_enabled === 'true' ? 'false' : 'true')}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.wa_enabled === 'true' ? 'bg-primary-container' : 'bg-outline'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.wa_enabled === 'true' ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            <p className="text-label-sm text-on-surface-variant">
              Available variables: {TEMPLATE_VARS.map(v => <code key={v} className="bg-surface-container px-xs rounded text-xs mx-xs">{v}</code>)}
            </p>

            {[
              { key: 'wa_template_confirmed', label: 'Order Confirmed message' },
              { key: 'wa_template_ready', label: 'Ready for Pickup message' },
              { key: 'wa_template_cancelled', label: 'Order Cancelled message' },
            ].map(({ key, label }) => (
              <div key={key} className="field">
                <label>{label}</label>
                <textarea
                  rows={3}
                  value={settings[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  className="font-mono text-sm"
                  placeholder="WhatsApp message template…"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Quotation */}
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Quotation Settings</span>
          </div>
          <div className="p-md flex flex-col gap-md">
            <div className="field">
              <label>Quote validity (days)</label>
              <input
                type="number" min="1" max="90"
                value={settings.quote_validity_days || '7'}
                onChange={e => set('quote_validity_days', e.target.value)}
              />
              <p className="text-label-sm text-on-surface-variant mt-xs">Quotations expire after this many days</p>
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Business Info</span>
          </div>
          <div className="p-md flex flex-col gap-md">
            {[
              { key: 'business_name', label: 'Business Name', placeholder: 'KarekatOS' },
              { key: 'business_phone', label: 'Phone', placeholder: '+91 XXXXXXXXXX' },
              { key: 'business_address', label: 'Address', placeholder: 'Full address' },
              { key: 'gstin', label: 'GSTIN', placeholder: 'GST number' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="field">
                <label>{label}</label>
                <input
                  value={settings[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notification Alert Settings */}
        <div className="card lg:col-span-2">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Dashboard Alert Settings</span>
            <span className="text-label-sm text-on-surface-variant">Browser push notifications for owner</span>
          </div>
          <div className="p-md flex flex-col gap-md">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
              {[
                { key: 'alert_absent',       label: 'Staff absent alert',              desc: 'Notify when staff marked absent' },
                { key: 'alert_overdue',      label: 'Overdue job alert',               desc: 'Notify when job passes deadline' },
                { key: 'alert_design_queue', label: 'Design queue high-load alert',    desc: 'Notify when 5+ designs pending review' },
                { key: 'alert_low_stock',    label: 'Low stock alert',                 desc: 'Notify when inventory hits reorder level' },
                { key: 'alert_large_order',  label: 'Large order alert',               desc: 'Notify when order above threshold received' },
                { key: 'alert_daily_summary','label': 'Daily summary notification',    desc: 'End-of-day summary push' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-sm bg-surface-container rounded-lg">
                  <div>
                    <p className="text-label-md text-on-surface font-semibold">{label}</p>
                    <p className="text-label-sm text-on-surface-variant">{desc}</p>
                  </div>
                  <button
                    onClick={() => set(key, (settings[key] || '1') === '1' ? '0' : '1')}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${(settings[key] || '1') === '1' ? 'bg-primary-container' : 'bg-outline'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${(settings[key] || '1') === '1' ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-md pt-sm border-t border-outline-variant">
              <div className="field">
                <label>Overdue threshold (hours)</label>
                <input type="number" min="1" max="72"
                  value={settings.overdue_threshold || '2'}
                  onChange={e => set('overdue_threshold', e.target.value)} />
                <p className="text-label-sm text-on-surface-variant mt-xs">Alert when job is overdue by this many hours</p>
              </div>
              <div className="field">
                <label>Large order trigger (₹)</label>
                <input type="number" min="0"
                  value={settings.large_order_amount || '5000'}
                  onChange={e => set('large_order_amount', e.target.value)} />
                <p className="text-label-sm text-on-surface-variant mt-xs">Alert when order total exceeds this amount</p>
              </div>
              <div className="field">
                <label>Daily summary hour (24h)</label>
                <input type="number" min="0" max="23"
                  value={settings.daily_summary_hour || '19'}
                  onChange={e => set('daily_summary_hour', e.target.value)} />
                <p className="text-label-sm text-on-surface-variant mt-xs">Send daily summary at this hour (e.g. 19 = 7PM)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
