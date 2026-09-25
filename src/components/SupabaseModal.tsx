import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  Save, 
  FileCode, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  getSavedConfig, 
  saveSupabaseConfig, 
  testConnection, 
  getSupabaseSQLSchema, 
  isSupabaseConnected 
} from '../lib/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs: number; error?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveAlert, setSaveAlert] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSavedConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      handleTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testConnection();
    setTesting(false);
    setTestResult(res);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig({
      url: url.trim(),
      anonKey: anonKey.trim()
    });
    setSaveAlert(true);
    onConfigUpdated();
    handleTest();
    setTimeout(() => setSaveAlert(false), 2500);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(getSupabaseSQLSchema());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-[#0f1914] w-full max-w-3xl rounded-3xl border border-[#d6eade] dark:border-[#1d3427] shadow-2xl shadow-black/20 dark:shadow-black/80 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-[#f0f7f2] dark:bg-[#13221a] border-b border-[#d6eade] dark:border-[#1c3225] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-emerald-950 dark:text-white flex items-center gap-2">
                <span>Conexión de Backend: Supabase</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isSupabaseConnected() 
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40' 
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                }`}>
                  {isSupabaseConnected() ? 'Activo' : 'Pendiente de credenciales'}
                </span>
              </h3>
              <span className="text-xs text-emerald-700/80 dark:text-emerald-300/70">
                PostgreSQL en la nube, autenticación y persistencia de eventos y asistencias.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-700/60 dark:text-emerald-400/60 hover:bg-[#e2efe6] dark:hover:bg-[#1b2f23] hover:text-emerald-950 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Status Diagnostic Card */}
          <div className="p-4 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] border border-[#d6eade] dark:border-[#1f3629] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${
                testResult?.ok ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-emerald-950 dark:text-white">
                  {testResult?.ok ? 'Conexión en Vivo Verificada' : 'Modo Híbrido Autocontenido'}
                </span>
                <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/70">
                  {testResult?.ok 
                    ? `Latencia de respuesta: ${testResult.latencyMs}ms hacia Supabase Cloud.`
                    : 'La aplicación opera con almacenamiento local y se sincronizará automáticamente al conectar tus llaves.'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#172c20] hover:bg-emerald-50 dark:hover:bg-[#1f3b2a] text-emerald-800 dark:text-emerald-200 border border-[#d6eade] dark:border-[#23422e] text-xs font-semibold flex items-center gap-2 transition-all self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
              <span>{testing ? 'Comprobando...' : 'Probar Conexión'}</span>
            </button>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSave} className="flex flex-col gap-4 bg-[#f7fbf8] dark:bg-[#111e17] p-5 rounded-2xl border border-[#d6eade] dark:border-[#1d3427]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Credenciales de tu Proyecto Supabase
            </h4>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://tu-proyecto.supabase.co"
                className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#14241b] text-emerald-950 dark:text-white text-xs font-mono border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Supabase Anon Public API Key
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#14241b] text-emerald-950 dark:text-white text-xs font-mono border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
              />
            </div>

            {saveAlert && (
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Configuración de Supabase guardada y sincronizada.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950 transition-all active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Credenciales</span>
              </button>
            </div>
          </form>

          {/* Ready-to-Run SQL Script */}
          <div className="flex flex-col gap-2.5 bg-[#f7fbf8] dark:bg-[#111e17] p-5 rounded-2xl border border-[#d6eade] dark:border-[#1d3427]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-950 dark:text-white">
                  Script DDL de Tablas PostgreSQL / Supabase
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#16291e] hover:bg-emerald-50 dark:hover:bg-[#1d3627] text-emerald-800 dark:text-emerald-200 border border-[#d6eade] dark:border-[#274433] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/70">
              Pega este script en el <span className="text-emerald-700 dark:text-emerald-300 font-semibold">SQL Editor</span> de tu consola Supabase para crear las tablas con las políticas Row Level Security (RLS).
            </p>

            <pre className="p-3.5 rounded-xl bg-white dark:bg-[#0a110d] text-emerald-900 dark:text-emerald-300 text-[11px] font-mono overflow-x-auto max-h-48 border border-[#d6eade] dark:border-[#1a2e22]">
              {getSupabaseSQLSchema()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
