/**
 * Email utility for EdDesk Admin Panel
 * Using Resend API (Fetch) with Table-based Layout for Email Compatibility
 */

export type EmailType = 
  | 'RECEIPT' 
  | 'REMINDER_5_DAY' 
  | 'BILL_GENERATED' 
  | 'BILL_PENDING' 
  | 'GRACE_WARNING_2_DAY' 
  | 'SHUTDOWN_NOTICE' 
  | 'LAPSED_NOTICE' 
  | 'SUPPORT_ESCALATION'
  | 'SUPPORT_REQUEST'
  | 'ADMIN_INVITE';

export interface EmailData {
  schoolName: string;
  planName?: string;
  amount?: number;
  paymentId?: string;
  orderId?: string;
  date: string;
  customerDomain?: string;
  fullname?: string;
  role?: string;
  inviteLink?: string;
  replyTo?: string;
}

export async function sendSubscriptionEmail(to: string, type: EmailType, data: EmailData) {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured");
    return { success: false, error: "Configuration missing" };
  }

  const adminUrl = "https://admin.eddesk.in";
  const companyUrl = "https://eddesk.in";
  const logoUrl = `${adminUrl}/logo-full.png`;

  let subject = "";
  let badge = "Action Required";
  let title = "Subscription Details";
  let message = "";
  let sender = "EdDesk <no-reply@eddesk.in>";
  let accentColor = "#2563eb";
  let headerBg = "#1e40af"; // Deep Blue

  switch (type) {
    case 'RECEIPT':
      subject = `Payment Receipt - ${data.planName} - EdDesk`;
      badge = "Payment Successful";
      title = "Thank You!";
      message = `We've successfully processed your payment for the <strong>${data.planName}</strong>. Your account is now active.`;
      headerBg = "#059669"; // Emerald
      sender = "EdDesk Invoice <invoice@eddesk.in>";
      break;
    
    case 'REMINDER_5_DAY':
      subject = `Upcoming Billing Reminder - EdDesk`;
      badge = "Billing in 5 Days";
      title = "Get Ready";
      message = `Hi ${data.schoolName}, your billing date is in 5 days. Please ensure your payment method is ready to avoid service interruption.`;
      headerBg = "#6366f1"; // Indigo
      break;

    case 'BILL_GENERATED':
      subject = `Bill Generated - EdDesk`;
      badge = "Action Required";
      title = "New Bill Ready";
      message = `Your bill for the <strong>${data.planName}</strong> has been generated today. Please subscribe to continue using the admin panel.`;
      headerBg = "#d97706"; // Amber
      break;

    case 'BILL_PENDING':
      subject = `Pending Subscription - EdDesk`;
      badge = "Pending Action";
      title = "Reminder";
      message = `Your subscription for ${data.schoolName} is currently pending. Please complete the process to ensure full access.`;
      headerBg = "#f59e0b"; // Warning
      break;

    case 'GRACE_WARNING_2_DAY':
      subject = `Urgent: Service Shutdown Impending`;
      badge = "Action Required";
      title = "48 Hours Remaining";
      message = `Final reminder: your grace period ends in 2 days. To prevent your website from being shut down, please renew your subscription now.`;
      headerBg = "#ea580c"; // Orange
      break;

    case 'SHUTDOWN_NOTICE':
      subject = `Service Suspended - EdDesk`;
      badge = "Website Offline";
      title = "Account Blocked";
      message = `Your grace period has ended and your website is now offline. Please renew your subscription to bring your website back to live.`;
      headerBg = "#dc2626"; // Red
      break;

    case 'LAPSED_NOTICE':
      subject = `We miss you! - EdDesk`;
      badge = "Final Reminder";
      title = "Your Website is Lapsed";
      message = `It's been 10 days since your service expired. You are missing out on your online presence. Renew now to reactivate everything instantly.`;
      headerBg = "#4b5563"; // gray-600
      break;

    case 'SUPPORT_ESCALATION':
      subject = `Internal Escalation: Lapsed Account [${data.schoolName}]`;
      badge = "Management Alert";
      title = "Escalation Required";
      message = `The account for <strong>${data.schoolName}</strong> remains unpaid 6 days after the final notice. Please review the details below for follow-up.`;
      headerBg = "#000000"; // Black
      sender = "EdDesk System <admin@eddesk.in>";
      break;

    case 'SUPPORT_REQUEST':
      sender = "EdDesk Admin <admin@eddesk.in>";
      break;

    case 'ADMIN_INVITE':
      subject = `Invitation to join ${data.schoolName} on EdDesk`;
      badge = "New Invitation";
      title = "Welcome to the Team!";
      message = `Hi ${data.fullname || 'there'}, you've been invited to join <strong>${data.schoolName}</strong> as <strong>${data.role || 'Admin'}</strong> on EdDesk. Click the button below to activate your account and set your password.`;
      headerBg = "#6366f1"; // Indigo
      sender = "EdDesk Authentification <auth@eddesk.in>";
      break;
  }

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>${subject}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 40px 0 40px 0;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                
                <!-- HEADER -->
                <tr>
                  <td align="center" bgcolor="${headerBg}" style="padding: 40px 40px 40px 40px;">
                    <!-- Logo Container with White Background and Corner Radius -->
                    <table border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 100px;">
                      <tr>
                        <td style="padding: 12px 28px;">
                          <img src="${logoUrl}" alt="EdDesk" width="140" style="display: block; border: 0;" />
                        </td>
                      </tr>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                      <tr>
                        <td align="center" style="border-radius: 100px; background-color: rgba(255,255,255,0.2); padding: 4px 16px; border: 1px solid rgba(255,255,255,0.4);">
                          <span style="color: #ffffff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">${badge}</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 20px 0 0 0;">${title}</h1>
                  </td>
                </tr>

                <!-- CONTENT -->
                <tr>
                  <td style="padding: 40px 40px 40px 40px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #1e293b; font-size: 16px; line-height: 24px; text-align: center;">
                          ${message}
                        </td>
                      </tr>
                      
                      ${type === 'RECEIPT' ? `
                      <tr>
                        <td style="padding: 30px 0 30px 0;">
                          <table border="0" cellpadding="20" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                            <tr>
                              <td align="center">
                                <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Amount Paid</p>
                                <h2 style="margin: 8px 0 0 0; color: #0f172a; font-size: 36px; font-weight: 900;">₹${data.amount.toLocaleString('en-IN')}</h2>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}

                      ${type === 'ADMIN_INVITE' ? `
                      <tr>
                        <td style="padding: 20px 0 20px 0;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td align="center" bgcolor="#4f46e5" style="border-radius: 12px;">
                                <a href="${adminUrl}/api/auth/invite?link=${encodeURIComponent(data.inviteLink || '')}" style="display: inline-block; padding: 18px 32px; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 16px; letter-spacing: -0.5px;">Activate My Account</a>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="padding-top: 16px;">
                                <p style="margin: 0; color: #94a3b8; font-size: 12px;">This link will expire in 24 hours.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}

                      <tr>
                        <td>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding: 10px 0;">School</td>
                              <td align="right" style="color: #1e293b; font-size: 14px; font-weight: 600; padding: 10px 0;">${data.schoolName}</td>
                            </tr>
                            ${data.planName ? `
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding: 10px 0;">Plan</td>
                              <td align="right" style="color: #1e293b; font-size: 14px; font-weight: 600; padding: 10px 0;">${data.planName}</td>
                            </tr>
                            ` : ''}
                            ${data.role ? `
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding: 10px 0;">Role</td>
                              <td align="right" style="color: #1e293b; font-size: 14px; font-weight: 600; padding: 10px 0;">${data.role}</td>
                            </tr>
                            ` : ''}
                            ${data.paymentId ? `
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding: 10px 0;">Payment ID</td>
                              <td align="right" style="color: #1e293b; font-size: 12px; font-family: monospace; padding: 10px 0;">${data.paymentId}</td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding: 10px 0;">Date</td>
                              <td align="right" style="color: #1e293b; font-size: 14px; font-weight: 600; padding: 10px 0;">${data.date}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- ACTIONS -->
                      <tr>
                        <td style="padding: 40px 0 0 0;">
                          <table border="0" cellpadding="0" cellspacing="10" width="100%">
                            <tr>
                              <td width="50%" align="center" bgcolor="#0f172a" style="border-radius: 8px;">
                                <a href="${adminUrl}/dashboard" style="display: inline-block; padding: 14px 20px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px;">Admin Panel</a>
                              </td>
                              ${data.customerDomain && type !== 'ADMIN_INVITE' ? `
                              <td width="50%" align="center" style="border-radius: 8px; border: 2px solid #e2e8f0;">
                                <a href="https://${data.customerDomain}" style="display: inline-block; padding: 12px 20px; color: #0f172a; text-decoration: none; font-weight: 700; font-size: 14px;">Visit Site</a>
                              </td>
                              ` : ''}
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td bgcolor="#f8fafc" style="padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #0f172a; font-size: 14px; font-weight: 700;">EdDesk Platform</p>
                    <p style="margin: 8px 0 20px 0; color: #64748b; font-size: 13px;">Empowering Schools, Transforming Education.</p>
                    
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 0 0 10px 0;">
                          <a href="${companyUrl}" style="color: #2563eb; text-decoration: none; font-weight: 600; font-size: 13px;">eddesk.in</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                      &copy; ${new Date().getFullYear()} EdDesk &bull; Professional EdTech Solutions
                    </p>
                    <p style="margin: 10px 0 0 0; color: #cbd5e1; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Secure Payments via Razorpay</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: sender,
        to: [to],
        subject: subject,
        reply_to: (data as any).replyTo || undefined,
        html: html,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("Resend API Error:", result);
      return { success: false, error: result.message };
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Resend internal error:", error);
    return { success: false, error: error.message };
  }
}
