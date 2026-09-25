# AsistEvent - Bienestar Institucional & Control de Asistencia

Plataforma integral para la gestión de eventos institucionales, control de acceso rápido con PIN de 4 dígitos, código QR dinámico y despacho automatizado de recordatorios por correo electrónico para el SENA.

## 🚀 Características Principales

- **Control de Asistencia Rápido (<1.8 seg):** Marcación con solo Número de Documento y PIN secreto de 4 dígitos.
- **Códigos QR de Evento:** Generación y descarga automática de códigos QR institucionales en alta resolución.
- **Servidor de Correo para Recordatorio de PIN:** Envío real de correos electrónicos vía Gmail SMTP para participantes que no recuerden su código.
- **Base de Datos Supabase:** Sincronización en la nube con respaldo resiliente y caché local offline.
- **Roles y Permisos (RBAC):** Separación de facultades por áreas (Líder de Bienestar, Deportes, Música, Danzas, etc.).
- **Modo Kiosco / Terminal de Autoservicio:** Teclado numérico y lector QR para puntos de acceso rápido.
- **Despliegue Continuo:** GitHub Actions listo para publicación en GitHub Pages.

---

## 📧 Configuración del Servidor de Correo (Gmail SMTP)

El servidor de desarrollo incluye un endpoint `/api/send-email` respaldado por `nodemailer` para enviar recordatorios de PIN de forma real.

En tu archivo `.env`, configura:

```env
# Configuración Gmail SMTP
SMTP_SERVICE="gmail"
SMTP_USER="tu_correo@gmail.com"
SMTP_PASS="tu_contraseña_de_aplicacion_16_caracteres"
SMTP_FROM="AsistEvent SENA Bienestar"
```

> **Nota:** Para obtener la contraseña de aplicación de 16 caracteres, ingresa a [Google App Passwords](https://myaccount.google.com/apppasswords) con la verificación en dos pasos activa.

---

## 🛠️ Instalación y Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación se abrirá en `http://localhost:3000/`.

3. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 🌐 Despliegue en GitHub Pages

La plataforma cuenta con un workflow de GitHub Actions en `.github/workflows/deploy.yml` que compila y publica automáticamente la aplicación en cada commit a la rama `main`.
