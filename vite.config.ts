import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Helper to reload .env dynamically
function getSmtpConfig() {
  const envPath = path.resolve(import.meta.dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    return {
      user: envConfig.SMTP_USER || process.env.SMTP_USER || '',
      pass: envConfig.SMTP_PASS || process.env.SMTP_PASS || '',
      service: envConfig.SMTP_SERVICE || process.env.SMTP_SERVICE || 'gmail',
      from: envConfig.SMTP_FROM || process.env.SMTP_FROM || 'AsistEvent SENA Bienestar'
    };
  }
  return {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    service: process.env.SMTP_SERVICE || 'gmail',
    from: process.env.SMTP_FROM || 'AsistEvent SENA Bienestar'
  };
}

function emailPlugin(): Plugin {
  return {
    name: 'asistevent-email-plugin',
    configureServer(server) {
      // 1. Check SMTP status
      server.middlewares.use('/api/email-status', (_req, res) => {
        const config = getSmtpConfig();
        const configured = Boolean(config.user && config.pass);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          configured,
          user: config.user ? `${config.user.slice(0, 3)}***@${config.user.split('@')[1] || 'gmail.com'}` : null
        }));
      });

      // 2. Save SMTP settings
      server.middlewares.use('/api/save-smtp', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { smtpUser, smtpPass } = JSON.parse(body);
            const envPath = path.resolve(import.meta.dirname, '.env');
            let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

            // Update or add SMTP_USER
            if (content.includes('SMTP_USER=')) {
              content = content.replace(/SMTP_USER=.*$/m, `SMTP_USER="${(smtpUser || '').trim()}"`);
            } else {
              content += `\nSMTP_USER="${(smtpUser || '').trim()}"`;
            }

            // Update or add SMTP_PASS
            if (content.includes('SMTP_PASS=')) {
              content = content.replace(/SMTP_PASS=.*$/m, `SMTP_PASS="${(smtpPass || '').trim()}"`);
            } else {
              content += `\nSMTP_PASS="${(smtpPass || '').trim()}"`;
            }

            fs.writeFileSync(envPath, content, 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Credenciales SMTP guardadas correctamente en .env' }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });

      // 3. Send real email endpoint
      server.middlewares.use('/api/send-email', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { to, name, docNumber, pin } = JSON.parse(body);

            if (!to || !pin) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Faltan parámetros obligatorios (to, pin)' }));
              return;
            }

            const config = getSmtpConfig();

            if (!config.user || !config.pass) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                configured: false,
                error: 'Para enviar correos de manera real, ingresa tu cuenta de Gmail y Contraseña de Aplicación de 16 caracteres en la configuración o en el archivo .env.'
              }));
              return;
            }

            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: config.user,
                pass: config.pass.replace(/\s+/g, '') // remove spaces from 16-character app password
              }
            });

            const htmlContent = `
              <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #d1fae5; overflow: hidden; box-shadow: 0 10px 25px rgba(6,78,59,0.08);">
                <div style="background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%); padding: 36px 28px; text-align: center; color: #ffffff;">
                  <span style="display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); padding: 4px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">SENA Bienestar al Aprendiz</span>
                  <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">AsistEvent</h1>
                  <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Sistema Institucional de Control de Asistencia</p>
                </div>
                
                <div style="padding: 32px 28px; color: #0f2417;">
                  <p style="font-size: 16px; margin: 0 0 14px 0; color: #064e3b;">
                    Hola, <strong>${name || 'Apreciado/a Participante'}</strong>:
                  </p>
                  <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 24px 0;">
                    Atendiendo a tu solicitud desde el punto de marcación para el documento de identidad <strong>${docNumber}</strong>, a continuación encuentras tu PIN de seguridad oficial:
                  </p>
                  
                  <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 2px dashed #059669; border-radius: 16px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                    <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #047857; letter-spacing: 1.8px; margin-bottom: 8px;">Tu PIN Secreto de Asistencia</span>
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #064e3b; display: inline-block;">${pin}</span>
                  </div>

                  <div style="background: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="font-size: 12px; line-height: 1.5; color: #475569; margin: 0;">
                      👉 <strong>Paso siguiente:</strong> Digita este código de 4 números junto a tu documento en la pantalla de asistencia o escáner QR del evento para completar tu registro oficial.
                    </p>
                  </div>

                  <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; border-top: 1px solid #f1f5f9; padding-top: 18px; text-align: center;">
                    Este es un mensaje institucional confidencial emitido por la plataforma AsistEvent. Si tú no realizaste esta solicitud, por favor haz caso omiso a este correo.
                  </p>
                </div>
                
                <div style="background-color: #f0fdf4; padding: 16px 24px; text-align: center; font-size: 11px; color: #047857; border-top: 1px solid #d1fae5;">
                  Servicio Nacional de Aprendizaje SENA • Dirección de Bienestar Institucional
                </div>
              </div>
            `;

            const info = await transporter.sendMail({
              from: `"${config.from}" <${config.user}>`,
              to,
              subject: '[AsistEvent SENA] Recordatorio Oficial de tu PIN de Asistencia',
              text: `Hola ${name}. Tu PIN de asistencia para AsistEvent es: ${pin} (Documento: ${docNumber}). Ingrésalo en la pantalla de marcación oficial.`,
              html: htmlContent
            });

            console.log(`[Email Service] Correo real enviado exitosamente a ${to}. ID: ${info.messageId}`);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              configured: true,
              messageId: info.messageId,
              to
            }));
          } catch (error: any) {
            console.error('[Email Service] Error al despachar correo:', error);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              configured: true,
              error: error.message || 'Error al autenticar o conectar con el servidor SMTP de Gmail.'
            }));
          }
        });
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), emailPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

