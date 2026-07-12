import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';

// In-memory OTP store (expires in 10 minutes)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'Systro Rescue Network <no-reply@systro.live>';

  if (!host || !user || !pass) {
    console.warn("SMTP configuration is incomplete. Verification code printed to console instead.");
    console.log(`[SMTP SIMULATOR] Verification code for ${email} is: ${code}`);
    return false; // Not sent via real SMTP, simulated instead
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure: Number(port) === 465,
      auth: { user, pass }
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'رمز التحقق الخاص بك لشبكة سيسترو | Systro Verification Code',
      text: `أهلاً بك في شبكة سيسترو للإنقاذ الطارئ. رمز التحقق الخاص بك هو: ${code}. هذا الرمز صالح لمدة 10 دقائق.`,
      html: `
        <div style="direction: rtl; text-align: right; font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 16px; background-color: #F8FAFC;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #F59E0B; margin: 0; font-size: 28px;">سيسترو | SYSTRO</h1>
            <p style="color: #64748B; font-size: 12px; margin-top: 5px;">شبكة الإنقاذ السريع والآمن</p>
          </div>
          <div style="background-color: #FFFFFF; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
            <h3 style="color: #0F172A; margin-top: 0;">رمز تحقق الدخول الآمن</h3>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              لقد طلبت تسجيل الدخول إلى بوابة سيسترو الآمنة. يرجى استخدام رمز التحقق المؤقت التالي لإتمام العملية:
            </p>
            <div style="background-color: #F1F5F9; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 6px; color: #D97706; margin: 20px 0; font-family: monospace;">
              ${code}
            </div>
            <p style="color: #64748B; font-size: 11px;">
              * هذا الرمز صالح لمدة 10 دقائق فقط. إذا لم تكن أنت من طلب هذا الرمز، يمكنك تجاهل هذا البريد بأمان.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #94A3B8; font-size: 11px;">
            جميع الحقوق محفوظة لشبكة سيسترو 2026 &copy;
          </div>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error("Error sending real SMTP email:", error);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Body parser middleware for JSON payloads
  app.use(express.json());

  // Serve API or health check routes first
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // POST endpoint to send OTP
  app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid email address' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

    // Save in memory store
    otpStore.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes from now
    });

    const sent = await sendVerificationEmail(normalizedEmail, code);

    res.json({
      success: true,
      sentViaSmtp: sent,
      codeSimulator: sent ? null : code, // Return code in response ONLY when SMTP is not configured for easy testing
      message: sent ? 'OTP code sent via email' : 'OTP printed to console / sandbox mode'
    });
  });

  // POST endpoint to verify OTP
  app.post('/api/verify-otp', (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: 'Email and verification code are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const saved = otpStore.get(normalizedEmail);

    if (!saved) {
      res.status(400).json({ error: 'No active verification request found or it expired.' });
      return;
    }

    if (Date.now() > saved.expiresAt) {
      otpStore.delete(normalizedEmail);
      res.status(400).json({ error: 'Verification code has expired.' });
      return;
    }

    if (saved.code !== code.trim()) {
      res.status(400).json({ error: 'Incorrect verification code.' });
      return;
    }

    // Success! Clear OTP code from memory store
    otpStore.delete(normalizedEmail);
    res.json({ success: true });
  });

  // Setup Vite middleware in development or serve static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

