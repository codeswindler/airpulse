'use client';

import { useState, useEffect } from 'react';
import UssdSimulator from '@/components/UssdSimulator';
import { Save, Lock, AlertTriangle, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'SIMULATOR'>('GENERAL');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>({});
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [showAirPulseKeys, setShowAirPulseKeys] = useState(false);
  const [showSmsKeys, setShowSmsKeys] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [meRes, configRes] = await Promise.all([
          fetch('/api/admin/me'),
          fetch('/api/admin/settings')
        ]);
        const meData = await meRes.json();
        const configData = await configRes.json();
        setUser(meData);
        setConfig(configData);
      } catch (err) {
        console.error('Failed to load settings data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSave = async () => {
    setStatus({ type: 'loading', msg: 'Saving configurations...' });
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        window.dispatchEvent(new Event('settings-updated'));
        setStatus({ type: 'success', msg: 'Settings updated successfully!' });
      } else {
        const data = await res.json();
        setStatus({ type: 'error', msg: data.error || 'Failed to save settings' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'A network error occurred' });
    }
    setTimeout(() => setStatus({ type: '', msg: '' }), 3000);
  };

  const isSuperAdmin = user?.role === 'SUPERADMIN';

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading configurations...</div>;

  if (!isSuperAdmin) {
    return (
      <div className="dashboard-scroll">
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>Platform settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Global configuration is restricted to superadmins. Business-specific credentials now live under each tenant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header">
        <div>
          <h1>Platform Configurations</h1>
          <p>Configure platform-wide callbacks, shared defaults, and external API gateways.</p>
        </div>
        <div className="action-buttons">
          <button 
            className="btn-primary" 
            disabled={!isSuperAdmin || status.type === 'loading'}
            style={{ 
              backgroundColor: isSuperAdmin ? 'var(--success-color)' : 'var(--bg-hover)', 
              border: 'none', 
              color: isSuperAdmin ? '#12141d' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isSuperAdmin ? 'pointer' : 'not-allowed',
              opacity: isSuperAdmin ? 1 : 0.6
            }}
            onClick={handleSave}
          >
            {isSuperAdmin ? <Save size={16} /> : <Lock size={16} />} 
            {status.type === 'loading' ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {status.msg && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          backgroundColor: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: status.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
          border: `1px solid ${status.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}`,
          fontSize: '14px'
        }}>
          {status.msg}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="settings-tabs" style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border-color)', marginTop: '24px', marginBottom: '32px' }}>
         <div 
           onClick={() => setActiveTab('GENERAL')}
           style={{ 
             padding: '12px 16px', 
             cursor: 'pointer', 
             color: activeTab === 'GENERAL' ? 'var(--accent-color)' : 'var(--text-secondary)',
             borderBottom: activeTab === 'GENERAL' ? '2px solid var(--accent-color)' : '2px solid transparent',
             fontWeight: 600,
             fontSize: '14px',
             transition: '0.2s'
           }}
         >
           Configurations
         </div>
         <div 
           onClick={() => setActiveTab('SIMULATOR')}
           style={{ 
             padding: '12px 16px', 
             cursor: 'pointer', 
             color: activeTab === 'SIMULATOR' ? 'var(--accent-color)' : 'var(--text-secondary)',
             borderBottom: activeTab === 'SIMULATOR' ? '2px solid var(--accent-color)' : '2px solid transparent',
             fontWeight: 600,
             fontSize: '14px',
             transition: '0.2s'
           }}
         >
           Menu Simulator (iPhone)
         </div>
      </div>

      {activeTab === 'GENERAL' ? (
        <div className="settings-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="settings-dual-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
             {/* USSD Section */}
             <div className="card">
                <h3 style={{ marginBottom: 20, fontSize: '15px' }}>USSD Limits</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Minimum Purchase (Ksh)</span>
                     <input type="number" 
                        value={config.ussd_min || 5} 
                        onChange={(e) => setConfig({ ...config, ussd_min: e.target.value })} 
                        style={{ width: 80, padding: 8, borderRadius: 6, backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} 
                     />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Maximum Purchase (Ksh)</span>
                     <input type="number" 
                        value={config.ussd_max || 5000} 
                        onChange={(e) => setConfig({ ...config, ussd_max: e.target.value })} 
                        style={{ width: 80, padding: 8, borderRadius: 6, backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} 
                     />
                  </div>
                </div>
             </div>

              {/* Tupay Section */}
             <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                   <h3 style={{ fontSize: '15px' }}>Tupay API Integration</h3>
                   {!isSuperAdmin && <Lock size={14} color="var(--text-muted)" />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>CONSUMER UUID</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={isSuperAdmin ? (showAirPulseKeys ? "text" : "password") : "password"}
                          disabled={!isSuperAdmin}
                          value={config.airpulse_uuid || ''}
                          onChange={(e) => setConfig({ ...config, airpulse_uuid: e.target.value })}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} 
                        />
                        {isSuperAdmin && (
                          <button 
                            type="button"
                            onClick={() => setShowAirPulseKeys(!showAirPulseKeys)}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            {showAirPulseKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                   </div>
                   <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>API KEY</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={isSuperAdmin ? (showAirPulseKeys ? "text" : "password") : "password"}
                          disabled={!isSuperAdmin}
                          value={config.airpulse_api_key || ''}
                          onChange={(e) => setConfig({ ...config, airpulse_api_key: e.target.value })}
                          style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} 
                        />
                        {isSuperAdmin && (
                          <button 
                            type="button"
                            onClick={() => setShowAirPulseKeys(!showAirPulseKeys)}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            {showAirPulseKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                   </div>
                   <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>SIGNING SECRET</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={isSuperAdmin ? (showAirPulseKeys ? "text" : "password") : "password"}
                          disabled={!isSuperAdmin}
                          value={config.airpulse_secret || ''}
                          onChange={(e) => setConfig({ ...config, airpulse_secret: e.target.value })}
                          style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} 
                        />
                        {isSuperAdmin && (
                          <button 
                            type="button"
                            onClick={() => setShowAirPulseKeys(!showAirPulseKeys)}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            {showAirPulseKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                   </div>
                   <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>BUSINESS NAME</label>
                      <input 
                        type="text"
                        disabled={!isSuperAdmin}
                        value={config.airpulse_business_name || ''}
                        onChange={(e) => setConfig({ ...config, airpulse_business_name: e.target.value })}
                        placeholder="e.g. AirPulse"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} 
                      />
                   </div>
                </div>
             </div>
          </div>

          <div className="card">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ fontSize: '16px' }}>SMS Gateway Integration</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                   <select 
                     value={config.sms_provider || 'advanta'}
                     onChange={(e) => setConfig({ ...config, sms_provider: e.target.value })}
                     style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                   >
                      <option value="advanta">Advanta SMS</option>
                      <option value="onfon">Onfon Media</option>
                   </select>
                </div>
             </div>

          <div className="settings-dual-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   {config.sms_provider === 'advanta' ? (
                     <>
                        <div>
                           <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>PARTNER ID</label>
                           <div style={{ position: 'relative' }}>
                             <input type={isSuperAdmin ? (showSmsKeys ? "text" : "password") : "password"} disabled={!isSuperAdmin} value={config.advanta_partner_id || ''} onChange={(e) => setConfig({ ...config, advanta_partner_id: e.target.value })} style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                             {isSuperAdmin && (
                               <button type="button" onClick={() => setShowSmsKeys(!showSmsKeys)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                 {showSmsKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                               </button>
                             )}
                           </div>
                        </div>
                        <div>
                           <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>ADVANTA API KEY</label>
                           <div style={{ position: 'relative' }}>
                             <input type={isSuperAdmin ? (showSmsKeys ? "text" : "password") : "password"} disabled={!isSuperAdmin} value={config.advanta_api_key || ''} onChange={(e) => setConfig({ ...config, advanta_api_key: e.target.value })} style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                             {isSuperAdmin && (
                               <button type="button" onClick={() => setShowSmsKeys(!showSmsKeys)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                 {showSmsKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                               </button>
                             )}
                           </div>
                        </div>
                        <div>
                           <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>SENDER ID / SHORTCODE</label>
                           <input type="text" disabled={!isSuperAdmin} value={config.advanta_sender_id || ''} onChange={(e) => setConfig({ ...config, advanta_sender_id: e.target.value })} placeholder="e.g. 21000" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                        </div>
                      </>
                   ) : (
                     <>
                        <div>
                           <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>CLIENT ID</label>
                           <div style={{ position: 'relative' }}>
                             <input type={isSuperAdmin ? (showSmsKeys ? "text" : "password") : "password"} disabled={!isSuperAdmin} value={config.onfon_client_id || ''} onChange={(e) => setConfig({ ...config, onfon_client_id: e.target.value })} style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                             {isSuperAdmin && (
                               <button type="button" onClick={() => setShowSmsKeys(!showSmsKeys)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                 {showSmsKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                               </button>
                             )}
                           </div>
                        </div>
                        <div>
                           <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>ONFON ACCESS KEY</label>
                           <div style={{ position: 'relative' }}>
                             <input type={isSuperAdmin ? (showSmsKeys ? "text" : "password") : "password"} disabled={!isSuperAdmin} value={config.onfon_access_key || ''} onChange={(e) => setConfig({ ...config, onfon_access_key: e.target.value })} style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                             {isSuperAdmin && (
                               <button type="button" onClick={() => setShowSmsKeys(!showSmsKeys)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                 {showSmsKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                               </button>
                             )}
                           </div>
                        </div>
                        <div>
                           <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>ONFON API KEY</label>
                           <div style={{ position: 'relative' }}>
                             <input type={isSuperAdmin ? (showSmsKeys ? "text" : "password") : "password"} disabled={!isSuperAdmin} value={config.onfon_api_key || ''} onChange={(e) => setConfig({ ...config, onfon_api_key: e.target.value })} style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                             {isSuperAdmin && (
                               <button type="button" onClick={() => setShowSmsKeys(!showSmsKeys)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                 {showSmsKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                               </button>
                             )}
                           </div>
                        </div>
                        <div>
                           <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>SENDER ID</label>
                           <input type="text" disabled={!isSuperAdmin} value={config.onfon_sender_id || ''} onChange={(e) => setConfig({ ...config, onfon_sender_id: e.target.value })} placeholder="e.g. TEXT_SMS" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: isSuperAdmin ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                        </div>
                      </>
                   )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div style={{ padding: '16px', borderRadius: '12px', border: '1px dashed var(--border-color)', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                         <AlertTriangle size={18} color="var(--accent-color)" />
                         <span style={{ fontSize: '14px', fontWeight: 600 }}>Low Balance Alerts</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                         Notification will be sent when your SMS units fall below this threshold.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <input type="number" value={config.sms_threshold || 500} onChange={(e) => setConfig({ ...config, sms_threshold: e.target.value })} style={{ width: '100px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)' }} />
                         <span style={{ fontSize: '13px' }}>Units</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {!isSuperAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
               <ShieldCheck size={20} color="var(--danger-color)" />
               <span style={{ fontSize: '13px', color: 'var(--danger-color)' }}>
                  You are viewing these settings in **Restricted Mode**. Only Superadmins can update API credentials.
               </span>
            </div>
          )}

        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
           <UssdSimulator />
        </div>
      )}
    </div>
  );
}
