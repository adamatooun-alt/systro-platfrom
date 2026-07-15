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

  const isPlaceholderUser = /[\u0600-\u06FF]/.test(user || '') || (user && (user.includes('البريد') || user.includes('المرسل')));
  const isPlaceholderPass = /[\u0600-\u06FF]/.test(pass || '') || (pass && (pass.includes('كلمة') || pass.includes('مرور')));

  if (!host || !user || !pass || isPlaceholderUser || isPlaceholderPass) {
    console.warn("SMTP configuration is incomplete or contains placeholders. Verification code printed to console instead.");
    console.log(`[SMTP SIMULATOR] Verification code for ${email} is: ${code}`);
    return false; // Not sent via real SMTP, simulated instead
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure: Number(port) === 465,
      auth: { user, pass },
      connectionTimeout: 4000, // 4 seconds max to connect
      greetingTimeout: 4000,   // 4 seconds max to greet
      socketTimeout: 5000      // 5 seconds socket inactivity
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
    
    // Check if SMTP is configured before proceeding
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const isPlaceholderUser = /[\u0600-\u06FF]/.test(user || '') || (user && (user.includes('البريد') || user.includes('المرسل')));
    const isPlaceholderPass = /[\u0600-\u06FF]/.test(pass || '') || (pass && (pass.includes('كلمة') || pass.includes('مرور')));

    if (isPlaceholderUser || isPlaceholderPass) {
      // SMTP configuration has placeholders. Fall back to 123456 for testing
      const fallbackCode = "123456";
      otpStore.set(normalizedEmail, {
        code: fallbackCode,
        expiresAt: Date.now() + 10 * 60 * 1000
      });

      res.json({
        success: true,
        sentViaSmtp: false,
        smtpNotConfigured: true,
        message: 'SMTP contains placeholders. Fallback code 123456 is active for testing.'
      });
      return;
    }

    if (!host || !user || !pass) {
      // SMTP is not configured. Use 123456 as a safe fallback code so the login flow is never blocked
      const fallbackCode = "123456";
      otpStore.set(normalizedEmail, {
        code: fallbackCode,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes from now
      });

      res.json({
        success: true,
        sentViaSmtp: false,
        smtpNotConfigured: true,
        message: 'SMTP is not configured. Fallback code 123456 is active for testing.'
      });
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

    // Save in memory store
    otpStore.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes from now
    });

    const sent = await sendVerificationEmail(normalizedEmail, code);

    if (!sent) {
      // SMTP sending failed. Use 123456 as a fallback code to prevent blocking the user
      const fallbackCode = "123456";
      otpStore.set(normalizedEmail, {
        code: fallbackCode,
        expiresAt: Date.now() + 10 * 60 * 1000
      });

      res.json({
        success: true,
        sentViaSmtp: false,
        smtpFailed: true,
        message: 'SMTP delivery failed. Fallback code 123456 is active for testing.'
      });
      return;
    }

    res.json({
      success: true,
      sentViaSmtp: true,
      message: 'OTP code sent via email'
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
    const enteredCode = code.trim();

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

    if (saved.code !== enteredCode) {
      res.status(400).json({ error: 'Incorrect verification code.' });
      return;
    }

    // Success! Clear OTP code from memory store
    otpStore.delete(normalizedEmail);
    res.json({ success: true });
  });

  // GET endpoint to check current SMTP configuration status
  app.get('/api/smtp-status', (req, res) => {
    res.json({
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      host: process.env.SMTP_HOST || '',
      port: process.env.SMTP_PORT || '',
      user: process.env.SMTP_USER || '',
      from: process.env.SMTP_FROM || 'Systro Rescue Network <no-reply@systro.live>',
      hasPass: !!process.env.SMTP_PASS
    });
  });

  // POST endpoint to send a test email using configured SMTP
  app.post('/api/test-smtp', async (req, res) => {
    const { testEmail } = req.body;
    if (!testEmail || !testEmail.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid recipient email address' });
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'Systro Rescue Network <no-reply@systro.live>';

    if (!host || !user || !pass) {
      res.status(400).json({ 
        error: 'SMTP credentials are not fully configured. Please add SMTP_HOST, SMTP_USER, and SMTP_PASS to your environment.' 
      });
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        auth: { user, pass }
      });

      // Verify connection first
      await transporter.verify();

      // Send test email
      await transporter.sendMail({
        from,
        to: testEmail.trim(),
        subject: 'Systro Real SMTP Test Email ✅',
        text: `Congratulations! Your real SMTP server is working perfectly with Systro. Connected successfully to ${host}.`,
        html: `
          <div style="direction: ltr; text-align: left; font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 16px; background-color: #F8FAFC;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #F59E0B; margin: 0; font-size: 28px;">SYSTRO SMTP TEST</h1>
              <p style="color: #64748B; font-size: 12px; margin-top: 5px;">Secure Email Delivery Engine</p>
            </div>
            <div style="background-color: #FFFFFF; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
              <h3 style="color: #0F172A; margin-top: 0; color: #10B981;">SMTP Server Verified Successfully! ✅</h3>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                This is a real test email confirming that your <strong>Systro</strong> portal is successfully connected to:
              </p>
              <div style="background-color: #F1F5F9; padding: 15px; border-radius: 8px; margin: 15px 0; font-family: monospace; font-size: 13px; color: #1E293B;">
                <strong>Host:</strong> ${host}<br/>
                <strong>Port:</strong> ${port || '587'}<br/>
                <strong>Username:</strong> ${user}<br/>
                <strong>Sender (From):</strong> ${from}
              </div>
              <p style="color: #64748B; font-size: 12px;">
                You can now log in securely using real instant OTP codes sent straight to your users' email inboxes!
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #94A3B8; font-size: 11px;">
              Systro Rescue Network &copy; 2026
            </div>
          </div>
        `
      });

      res.json({ success: true, message: `Test email sent successfully to ${testEmail}!` });
    } catch (error: any) {
      console.error("Test SMTP error:", error);
      res.status(500).json({ 
        error: error.message || 'Failed to authenticate or send email via SMTP server.' 
      });
    }
  });

  // GET endpoint to check current WhatsApp configuration status
  app.get('/api/whatsapp-status', (req, res) => {
    res.json({
      configured: !!(process.env.WHATSAPP_INSTANCE_ID && process.env.WHATSAPP_TOKEN),
      instanceId: process.env.WHATSAPP_INSTANCE_ID || '',
      token: process.env.WHATSAPP_TOKEN || '',
      apiUrl: process.env.WHATSAPP_API_URL || 'https://api.ultramsg.com'
    });
  });

  // POST endpoint to send a test WhatsApp message
  app.post('/api/test-whatsapp', async (req, res) => {
    const { testPhone } = req.body;
    if (!testPhone) {
      res.status(400).json({ error: 'Please provide a recipient phone number' });
      return;
    }

    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;
    const apiUrl = process.env.WHATSAPP_API_URL || 'https://api.ultramsg.com';

    if (!instanceId || !token) {
      res.status(400).json({ 
        error: 'WhatsApp gateway is not configured. Please define WHATSAPP_INSTANCE_ID and WHATSAPP_TOKEN in your environment.' 
      });
      return;
    }

    try {
      const cleanPhone = testPhone.replace(/[\s\+\-]/g, '');
      const testMsg = `📱 *تأكيد ربط بوابة الواتس اب لشبكة سيسترو* ✅\n\nتهانينا! تم ربط وتفعيل حساب الواتس اب الخاص بك مع نظام الإشعارات والطوارئ لشبكة سيسترو بنجاح.\n\nمن الآن فصاعداً، ستصلك رسائل الطوارئ والبلاغات فوراً هنا على رقمك المسجل.\n\n*Systro Rescue Network &copy; 2026*`;

      const response = await fetch(`${apiUrl}/${instanceId}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: token,
          to: cleanPhone,
          body: testMsg,
          priority: '10'
        })
      });

      if (response.ok) {
        res.json({ success: true, message: `Test WhatsApp sent successfully to +${cleanPhone}!` });
      } else {
        const errText = await response.text();
        res.status(400).json({ error: `WhatsApp gateway returned error: ${errText}` });
      }
    } catch (error: any) {
      console.error("Test WhatsApp error:", error);
      res.status(500).json({ 
        error: error.message || 'Failed to authenticate or connect with UltraMsg API.' 
      });
    }
  });

  // POST endpoint to dispatch live email and WhatsApp alerts to matching technicians
  app.post('/api/dispatch-rescue-notifications', async (req, res) => {
    const { requestDetails, technicians, appUrl, lang } = req.body;
    if (!requestDetails || !technicians || !Array.isArray(technicians)) {
      res.status(400).json({ error: 'Missing requestDetails or technicians array' });
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'Systro Rescue Network <no-reply@systro.live>';

    const whatsappInstanceId = process.env.WHATSAPP_INSTANCE_ID;
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    const whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://api.ultramsg.com';

    let emailsSent = 0;
    let whatsappsSent = 0;
    let errors: string[] = [];

    // Helper translations
    const getServiceArName = (type: string) => {
      switch (type) {
        case 'fuel': return 'توصيل وقود طارئ ⛽';
        case 'locksmith': return 'فتح أقفال سيارات 🔑';
        case 'mechanic': return 'صيانة وميكانيك سيارات 🛠️';
        case 'battery': return 'اشتراك بطارية 🔋';
        case 'tire': return 'تبديل إطار 🚗';
        case 'towing': return 'ونش سحب وسحب مركبات 🚚';
        default: return 'خدمة إنقاذ مخصصة 🔧';
      }
    };

    const getServiceEnName = (type: string) => {
      switch (type) {
        case 'fuel': return 'Emergency Fuel Delivery ⛽';
        case 'locksmith': return 'Car Locksmith Services 🔑';
        case 'mechanic': return 'Roadside Mechanical Service 🛠️';
        case 'battery': return 'Battery Jump Start 🔋';
        case 'tire': return 'Flat Tire Replacement 🚗';
        case 'towing': return 'Towing & Vehicle Recovery 🚚';
        default: return 'Custom Specialty Service 🔧';
      }
    };

    const serviceName = lang === 'ar' ? getServiceArName(requestDetails.serviceType) : getServiceEnName(requestDetails.serviceType);
    const displayedPrice = requestDetails.basePrice || 120;

    for (const tech of technicians) {
      // 1. Send Email Alert (SMTP)
      if (tech.notifyEmail && tech.email && host && user && pass) {
        try {
          const transporter = nodemailer.createTransport({
            host,
            port: Number(port) || 587,
            secure: Number(port) === 465,
            auth: { user, pass }
          });

          await transporter.sendMail({
            from,
            to: tech.email.trim(),
            subject: lang === 'ar' 
              ? `🚨 نداء استغاثة عاجل [السعر: ${displayedPrice} ₪]: مطلوب ${serviceName} في موقعك!` 
              : `🚨 Live Dispatch Alert [Price: ${displayedPrice} ₪]: Emergency ${serviceName} requested!`,
            text: `نداء استغاثة جديد من العميل ${requestDetails.clientName}. السعر المقدر: ${displayedPrice} ₪. للتفاصيل يرجى مراجعة بوابة فنيي سيسترو.`,
            html: `
              <div style="direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; text-align: ${lang === 'ar' ? 'right' : 'left'}; font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 20px; background-color: #0F1424; color: #FFFFFF;">
                <div style="text-align: center; margin-bottom: 25px; border-bottom: 1px solid #1E293B; padding-bottom: 15px;">
                  <h1 style="color: #F59E0B; margin: 0; font-size: 26px;">سيسترو إنقاذ | SYSTRO RESCUE</h1>
                  <span style="background-color: #EF4444; color: #FFFFFF; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; margin-top: 5px; display: inline-block;">
                    ${lang === 'ar' ? 'نداء استغاثة نشط 📡' : 'Live Emergency Dispatch 📡'}
                  </span>
                </div>
                
                <div style="background-color: #0A0B10; padding: 20px; border-radius: 16px; border: 1px solid #1E293B; margin-bottom: 20px;">
                  <h3 style="color: #F59E0B; margin-top: 0; font-size: 16px;">
                    ${lang === 'ar' ? 'تفاصيل حالة الطوارئ على الطريق:' : 'Emergency Task Details:'}
                  </h3>
                  
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #E2E8F0; margin-top: 15px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; width: 120px;"><strong>${lang === 'ar' ? 'الخدمة المطلوبة:' : 'Service Type:'}</strong></td>
                      <td style="padding: 6px 0; font-weight: bold; color: #F59E0B;">${serviceName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B;"><strong>${lang === 'ar' ? 'السعر المقدر:' : 'Estimated Price:'}</strong></td>
                      <td style="padding: 6px 0; font-weight: bold; color: #10B981; font-size: 20px; background-color: #052e16; padding: 4px 10px; border-radius: 8px; display: inline-block;">${displayedPrice} ₪</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B;"><strong>${lang === 'ar' ? 'اسم العميل:' : 'Client Name:'}</strong></td>
                      <td style="padding: 6px 0; font-weight: bold;">${requestDetails.clientName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B;"><strong>${lang === 'ar' ? 'هاتف التواصل:' : 'Client Phone:'}</strong></td>
                      <td style="padding: 6px 0; font-weight: bold;"><a href="tel:${requestDetails.clientPhone}" style="color: #38BDF8; text-decoration: none;">${requestDetails.clientPhone}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B;"><strong>${lang === 'ar' ? 'موقع العطل:' : 'Location:'}</strong></td>
                      <td style="padding: 6px 0;">${lang === 'ar' ? requestDetails.arLocationName || requestDetails.locationName : requestDetails.locationName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B;"><strong>${lang === 'ar' ? 'تفاصيل المشكلة:' : 'Description:'}</strong></td>
                      <td style="padding: 6px 0; font-style: italic; color: #94A3B8;">"${requestDetails.description || 'لا توجد تفاصيل إضافية'}"</td>
                    </tr>
                  </table>
                  
                  <div style="text-align: center; margin-top: 25px;">
                    <a href="${appUrl || 'https://systro.live'}?tab=home" style="background-color: #F59E0B; color: #000000; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; display: inline-block; transition: all 0.2s;">
                      ${lang === 'ar' ? 'تقديم عرض سعر فوري ومساعدة السائق 🚚' : 'Submit Live Quote & Help Driver 🚚'}
                    </a>
                  </div>
                </div>

                <div style="text-align: center; color: #64748B; font-size: 11px;">
                  أرسل هذا التنبيه الفوري لكونك مسجل كتقني معتمد في تخصص (${serviceName}). يمكنك تعديل تفضيلات الإشعارات من لوحة التحكم في أي وقت.
                  <br/><br/>
                  &copy; 2026 Systro Rescue Network. All Rights Reserved.
                </div>
              </div>
            `
          });
          emailsSent++;
        } catch (err: any) {
          console.error(`Error sending email to technician ${tech.email}:`, err);
          errors.push(`Email error for ${tech.email}: ${err.message}`);
        }
      }

      // 2. Send WhatsApp Alert (UltraMsg API)
      if (tech.notifyWhatsapp && tech.phone && whatsappInstanceId && whatsappToken) {
        try {
          const messageText = lang === 'ar' 
            ? `🚨 *إشعار طوارئ عاجل من شبكة سيسترو للإنقاذ* 🚨\n\nأهلاً بك يا *${tech.name}*، تم تقديم نداء استغاثة جديد يتطلب تخصصك الفني:\n\n🔧 *الخدمة المطلوبة:* ${serviceName}\n💰 *سعر الخدمة المقدر:* [ *${displayedPrice} ₪* ]\n👤 *اسم العميل:* ${requestDetails.clientName}\n📞 *هاتف العميل:* ${requestDetails.clientPhone}\n📍 *الموقع:* ${lang === 'ar' ? requestDetails.arLocationName || requestDetails.locationName : requestDetails.locationName}\n📝 *تفاصيل العطل:* ${requestDetails.description || 'لا توجد'}\n\nالرجاء الضغط على الرابط التالي فوراً لتقديم عرض السعر الفوري ومساعدة العميل:\n🔗 ${appUrl || 'https://systro.live'}?tab=home\n\nشكراً لجهودكم وسرعة استجابتكم!`
            : `🚨 *Live Rescue Alert: Systro Dispatch Network* 🚨\n\nHello *${tech.name}*, a new emergency request requires your specialty:\n\n🔧 *Service:* ${serviceName}\n💰 *Estimated Price:* [ *${displayedPrice} ₪* ]\n👤 *Client:* ${requestDetails.clientName}\n📞 *Phone:* ${requestDetails.clientPhone}\n📍 *Location:* ${requestDetails.locationName}\n📝 *Details:* ${requestDetails.description || 'N/A'}\n\nTap the link below to submit a live bid and dispatch:\n🔗 ${appUrl || 'https://systro.live'}?tab=home\n\nThank you for your rapid response!`;

          // Format phone to clean international format (remove spaces, plus, dashes, leading zeroes)
          let formattedPhone = tech.phone.replace(/[\s\+\-]/g, '');
          if (formattedPhone.startsWith('05')) {
            formattedPhone = '972' + formattedPhone.substring(1);
          } else if (formattedPhone.startsWith('5')) {
            formattedPhone = '972' + formattedPhone;
          }

          const response = await fetch(`${whatsappApiUrl}/${whatsappInstanceId}/messages/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              token: whatsappToken,
              to: formattedPhone,
              body: messageText,
              priority: '10'
            })
          });

          if (response.ok) {
            whatsappsSent++;
          } else {
            const rawText = await response.text();
            console.error(`WhatsApp gateway responded with status ${response.status} for ${tech.phone}:`, rawText);
            errors.push(`WhatsApp error for ${tech.phone}: HTTP ${response.status}`);
          }
        } catch (err: any) {
          console.error(`Error sending WhatsApp to technician ${tech.phone}:`, err);
          errors.push(`WhatsApp error for ${tech.phone}: ${err.message}`);
        }
      }
    }

    res.json({
      success: true,
      emailsSent,
      whatsappsSent,
      smtpConfigured: !!(host && user && pass),
      whatsappConfigured: !!(whatsappInstanceId && whatsappToken),
      errors: errors.length > 0 ? errors : null
    });
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

