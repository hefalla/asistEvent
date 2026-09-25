import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound, 
  CreditCard, 
  Sparkles, 
  ExternalLink, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  Save,
  Globe,
  Server
} from 'lucide-react';
import { 
  recoverParticipantPin, 
  PinRecoveryResult, 
  checkEmailServiceStatus, 
  saveSmtpCredentials,
  getEmailJSConfig,
  saveEmailJSConfig,
  isEmailJSConfigured
} from '../lib/supabase';

interface RecoverPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  onPinSelected?: (pin: string, docNumber?: string) => void;
}

export const RecoverPinModal: React.FC<RecoverPinModalProps> = ({
  isOpen,
  onClose,
  initialIdentifier = '',
  onPinSelected
}) => {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PinRecoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Email service status & configuration state
  const [emailStatus, setEmailStatus] = useState<{ configured: boolean; user: string | null; provider: 'emailjs' | 'smtp' | null }>({
    configured: false,
    user: null,
    provider: null
  });
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [configTab, setConfigTab] = useState<'emailjs' | 'smtp'>('emailjs');

  // EmailJS fields
  const [ejsServiceId, setEjsServiceId] = useState('');
  const [ejsTemplateId, setEjsTemplateId] = useState('');
  const [ejsPublicKey, setEjsPublicKey] = useState('');

  // SMTP fields
  const [cfgGmail, setCfgGmail] = useState('');
  const [cfgAppPass, setCfgAppPass] = useState('');

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const fetchStatus = async () => {
    const status = await checkEmailServiceStatus();
    setEmailStatus(status);

    const ejs = getEmailJSConfig();
    setEjsServiceId(ejs.serviceId);
    setEjsTemplateId(ejs.templateId);
    setEjsPublicKey(ejs.publicKey);
  };

  useEffect(() => {
    if (isOpen) {
      setIdentifier(initialIdentifier);
      setResult(null);
      setError(null);
      setShowConfigDrawer(false);
      setConfigFeedback(null);
      fetchStatus();
    }
  }, [isOpen, initialIdentifier]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await recoverParticipantPin(identifier.trim());
      if (res.success) {
        setResult(res);
      } else {
        setError(res.message);
        if (res.message.includes('EmailJS') || res.message.includes('GitHub Pages') || res.message.includes('Configura')) {
          setShowConfigDrawer(true);
          setConfigTab('emailjs');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error al intentar procesar la solicitud de recordatorio.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmailJS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ejsServiceId.trim() || !ejsTemplateId.trim() || !ejsPublicKey.trim()) return;

    setIsSavingConfig(true);
    try {
      saveEmailJSConfig({
        serviceId: ejsServiceId.trim(),
        templateId: ejsTemplateId.trim(),
        publicKey: ejsPublicKey.trim()
      });

      setConfigFeedback({
        success: true,
        message: '¡Configuración de EmailJS guardada! Ya puedes enviar correos reales en GitHub Pages.'
      });
      fetchStatus();
      setError(null);
      setTimeout(() => setShowConfigDrawer(false), 2000);
    } catch (err: any) {
      setConfigFeedback({
        success: false,
        message: err.message || 'Error al guardar la configuración de EmailJS.'
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgGmail.trim() || !cfgAppPass.trim()) return;

    setIsSavingConfig(true);
    setConfigFeedback(null);

    try {
      const res = await saveSmtpCredentials(cfgGmail.trim(), cfgAppPass.trim());
      if (res.success) {
        setConfigFeedback({
          success: true,
          message: '¡Credenciales de Gmail guardadas! Activas para servidores Node.js locales.'
        });
        await fetchStatus();
        setError(null);
        setTimeout(() => setShowConfigDrawer(false), 2000);
      } else {
        setConfigFeedback({
          success: false,
          message: res.error || 'No se pudo guardar la configuración.'
        });
      }
    } catch (err: any) {
      setConfigFeedback({
        success: false,
        message: err.message || 'Error al guardar credenciales.'
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#0f1914] rounded-3xl border border-[#d6eade] dark:border-[#1c3225] shadow-2xl shadow-emerald-950/30 overflow-hidden text-emerald-950 dark:text-emerald-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white dark:from-[#13221a] dark:via-[#111e17] dark:to-[#0f1914] border-b border-[#d6eade] dark:border-[#1c3225] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-emerald-950 dark:text-white flex items-center gap-2">
                <span>Recordar PIN de Asistencia</span>
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </h2>
              <p className="text-xs text-emerald-800/70 dark:text-emerald-300/70">
                Envío seguro a tu correo electrónico registrado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-800/70 dark:text-emerald-400/70 hover:bg-emerald-100 dark:hover:bg-[#1a2f23] transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Email Service Status Indicator */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] border border-[#d6eade] dark:border-[#1f3629] text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${emailStatus.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-semibold text-emerald-950 dark:text-white">
                {emailStatus.configured 
                  ? emailStatus.provider === 'emailjs'
                    ? `EmailJS Conectado (${emailStatus.user})`
                    : `Gmail SMTP Activo (${emailStatus.user})`
                  : 'EmailJS no configurado (Requerido para GitHub Pages)'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 underline flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>{showConfigDrawer ? 'Ocultar' : 'Configurar'}</span>
              {showConfigDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Collapsible Configuration Drawer */}
          {showConfigDrawer && (
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-3 animate-in fade-in duration-150">
              
              {/* Tabs: EmailJS (GitHub Pages) vs Gmail SMTP (Local) */}
              <div className="flex items-center gap-2 p-1 bg-white/70 dark:bg-[#111e17] rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setConfigTab('emailjs')}
                  className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    configTab === 'emailjs'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-emerald-900 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-[#16271e]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>EmailJS (GitHub Pages)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigTab('smtp')}
                  className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    configTab === 'smtp'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-emerald-900 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-[#16271e]'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Gmail SMTP (Local)</span>
                </button>
              </div>

              {configFeedback && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  configFeedback.success 
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' 
                    : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200'
                }`}>
                  {configFeedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{configFeedback.message}</span>
                </div>
              )}

              {/* TAB 1: EMAILJS (FOR GITHUB PAGES) */}
              {configTab === 'emailjs' ? (
                <form onSubmit={handleSaveEmailJS} className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2 text-[11px] text-amber-900/90 dark:text-amber-200/90">
                    <span>
                      EmailJS permite enviar correos en <strong>GitHub Pages</strong> conectando tu Gmail sin necesidad de servidor.
                    </span>
                    <a
                      href="https://dashboard.emailjs.com/sign-up"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline shrink-0 flex items-center gap-1"
                    >
                      <span>Crear cuenta gratis</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-amber-950 dark:text-amber-200 block mb-0.5">
                      Service ID (ej. service_gmail):
                    </label>
                    <input
                      type="text"
                      required
                      value={ejsServiceId}
                      onChange={(e) => setEjsServiceId(e.target.value)}
                      placeholder="service_xxxxxxx"
                      className="w-full h-8 px-2.5 rounded-xl bg-white dark:bg-[#101b15] text-xs text-emerald-950 dark:text-white border border-amber-300 dark:border-amber-800 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-amber-950 dark:text-amber-200 block mb-0.5">
                      Template ID (ej. template_asistevent):
                    </label>
                    <input
                      type="text"
                      required
                      value={ejsTemplateId}
                      onChange={(e) => setEjsTemplateId(e.target.value)}
                      placeholder="template_xxxxxxx"
                      className="w-full h-8 px-2.5 rounded-xl bg-white dark:bg-[#101b15] text-xs text-emerald-950 dark:text-white border border-amber-300 dark:border-amber-800 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-amber-950 dark:text-amber-200 block mb-0.5">
                      Public Key (Account &gt; Public Key):
                    </label>
                    <input
                      type="text"
                      required
                      value={ejsPublicKey}
                      onChange={(e) => setEjsPublicKey(e.target.value)}
                      placeholder="pk_xxxxxxx o clave pública"
                      className="w-full h-8 px-2.5 rounded-xl bg-white dark:bg-[#101b15] text-xs text-emerald-950 dark:text-white border border-amber-300 dark:border-amber-800 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingConfig || !ejsServiceId.trim() || !ejsTemplateId.trim() || !ejsPublicKey.trim()}
                    className="w-full h-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar y Activar EmailJS</span>
                  </button>
                </form>
              ) : (
                /* TAB 2: LOCAL GMAIL SMTP */
                <form onSubmit={handleSaveSmtp} className="space-y-2.5">
                  <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90">
                    Solo funciona en entorno de desarrollo local con Node.js (<code className="font-mono">npm run dev</code>).
                  </p>

                  <div>
                    <label className="text-[11px] font-semibold text-amber-950 dark:text-amber-200 block mb-0.5">
                      Tu Correo Gmail:
                    </label>
                    <input
                      type="email"
                      required
                      value={cfgGmail}
                      onChange={(e) => setCfgGmail(e.target.value)}
                      placeholder="edthf2015@gmail.com"
                      className="w-full h-8 px-2.5 rounded-xl bg-white dark:bg-[#101b15] text-xs text-emerald-950 dark:text-white border border-amber-300 dark:border-amber-800 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-amber-950 dark:text-amber-200 block mb-0.5">
                      Contraseña de Aplicación (16 letras):
                    </label>
                    <input
                      type="password"
                      required
                      value={cfgAppPass}
                      onChange={(e) => setCfgAppPass(e.target.value)}
                      placeholder="mkwd eeqo ksqb uyro"
                      className="w-full h-8 px-2.5 rounded-xl bg-white dark:bg-[#101b15] text-xs text-emerald-950 dark:text-white border border-amber-300 dark:border-amber-800 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingConfig || !cfgGmail.trim() || !cfgAppPass.trim()}
                    className="w-full h-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar en .env local</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {!result ? (
            /* STEP 1: Search & Dispatch Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#f0f7f2] dark:bg-[#14231b] border border-[#d6eade] dark:border-[#1d3527] text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Ingresa tu número de documento o correo registrado. Enviaremos de manera real tu PIN de 4 dígitos directamente a tu cuenta de correo.
                </span>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-semibold">Aviso</strong>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Número de Documento o Correo Registrado</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ej. 1024567890 o cmendoza@sena.edu.co"
                  className="w-full h-12 px-4 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-sm font-medium border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl bg-[#f0f7f2] dark:bg-[#14231b] hover:bg-emerald-100 dark:hover:bg-[#1b2f23] text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#203729] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !identifier.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Despachando correo real...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Enviar PIN a mi Correo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: Real Email Dispatched View (NO PIN PREVIEW FOR SECURITY) */
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Notification Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 dark:from-[#13221a] dark:to-[#0f1b14] border-2 border-emerald-500/60 text-emerald-950 dark:text-emerald-100 space-y-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-white">
                      ¡Correo Enviado con Éxito!
                    </h3>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                      Mensaje despachado a tu bandeja de entrada
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c1511] border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-700/80 dark:text-emerald-400/80 tracking-wider block">
                    Destinatario Oficial
                  </span>
                  <div className="font-mono font-bold text-emerald-950 dark:text-white text-xs sm:text-sm tracking-wide break-all">
                    {result.maskedEmail || result.email}
                  </div>
                  <p className="text-[11px] text-emerald-800/70 dark:text-emerald-300/70">
                    Asignado a: <strong>{result.name}</strong> • Doc: <strong>{result.doc_number}</strong>
                  </p>
                </div>

                <div className="space-y-2 text-xs text-emerald-900/90 dark:text-emerald-200 leading-relaxed">
                  <p>
                    🔒 <strong>Por tu seguridad y privacidad institucional</strong>, tu código PIN de 4 dígitos ha sido enviado únicamente a tu correo electrónico y <strong>no se muestra en pantalla</strong>.
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                    💡 <em>Tip: Si no ves el mensaje en tu bandeja principal, revisa la carpeta de &ldquo;Correo no deseado&rdquo; o &ldquo;Spam&rdquo;.</em>
                  </p>
                </div>
              </div>

              {/* Webmail Quick Links */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-emerald-900/80 dark:text-emerald-300/80 block">
                  Accesos rápidos a tu bandeja de correo:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#f0f7f2] dark:bg-[#14231b] hover:bg-emerald-100 dark:hover:bg-[#1b2f23] text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#203729] text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Abrir Gmail</span>
                  </a>

                  <a
                    href="https://outlook.office.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#f0f7f2] dark:bg-[#14231b] hover:bg-emerald-100 dark:hover:bg-[#1b2f23] text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#203729] text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Abrir Outlook / SENA</span>
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-[#e2efe6] dark:border-[#192b20]">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[#f0f7f2] dark:bg-[#14231b] hover:bg-emerald-100 dark:hover:bg-[#1b2f23] text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#203729] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Probar con otro documento
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Ya tengo mi PIN, Ingresar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
