/**
 * Email utility for EdDesk Admin Panel
 * Using Resend API (Fetch) with Table-based Layout for Email Compatibility
 */

export type EmailType = 'RECEIPT' | 'REMINDER' | 'GRACE_PERIOD' | 'FINAL_EXPIRY';

export interface ReceiptData {
  schoolName: string;
  planName: string;
  amount: number;
  paymentId?: string;
  orderId?: string;
  date: string;
  customerDomain?: string;
}

export async function sendSubscriptionEmail(to: string, type: EmailType, data: ReceiptData) {
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
    
    case 'REMINDER':
      subject = `Renewal Reminder - EdDesk`;
      badge = "Renewal Reminder";
      title = "Time to Renew";
      message = `Hi ${data.schoolName}, your ${data.planName} expires in 5 days. Renew now to stay active.`;
      headerBg = "#6d28d9"; // Violet
      break;

    case 'GRACE_PERIOD':
      subject = `Important: Subscription Expired`;
      badge = "Action Required";
      title = "Access Restricted";
      message = `Your ${data.planName} has expired. You are in a ${data.date} grace period.`;
      headerBg = "#d97706"; // Amber
      break;

    case 'FINAL_EXPIRY':
      subject = `Urgent: Final Notice`;
      badge = "Service Suspended";
      title = "Website Offline";
      message = `Your grace period has ended. Your site will be taken offline shortly unless payment is made.`;
      headerBg = "#991b1b"; // Red
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
                    <img src="${logoUrl}" alt="EdDesk" width="180" style="display: block; filter: brightness(0) invert(1);" />
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

                      <tr>
                        <td>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding: 10px 0;">School</td>
                              <td align="right" style="color: #1e293b; font-size: 14px; font-weight: 600; padding: 10px 0;">${data.schoolName}</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding: 10px 0;">Plan</td>
                              <td align="right" style="color: #1e293b; font-size: 14px; font-weight: 600; padding: 10px 0;">${data.planName}</td>
                            </tr>
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
                              ${data.customerDomain ? `
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
                        <td align="center" style="padding: 0 0 20px 0;">
                          <a href="${companyUrl}" style="color: #2563eb; text-decoration: none; font-weight: 600; font-size: 13px;">eddesk.in</a>
                          <span style="color: #cbd5e1; padding: 0 10px;">|</span>
                          <a href="https://tech.sacglobe.com" style="color: #64748b; text-decoration: none; font-weight: 600; font-size: 13px;">SAC Globe Tech</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                      &copy; ${new Date().getFullYear()} EdDesk &bull; A product of <a href="https://tech.sacglobe.com" style="color: #94a3b8; text-decoration: underline;">SAC Globe Tech</a>
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
