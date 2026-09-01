import nodemailer from 'nodemailer';

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendNotificationEmail({
  to,
  subject,
  html,
}: SendMailParams) {
  try {
    const info = await transporter.sendMail({
      // 1. เปลี่ยนชื่อผู้ส่งตรงนี้
      from: `"Maison de Nongkhiaw Resort" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log('Email sent successfully ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email via Nodemailer:', error);
    return { success: false, error };
  }
}

export { sendNotificationEmail as sendBookingConfirmation };

// 2. Helper สรรสร้าง HTML Template สวยงามสไตล์โรงแรม (2 ภาษา: ลาว + อังกฤษ)
export function generatePaymentVerifyEmailHtml({
  customerName,
  bookingId,
  isPaid,
  reason,
}: {
  customerName: string;
  bookingId: string;
  isPaid: boolean;
  reason?: string;
}) {
  const statusColor = isPaid ? '#10b981' : '#ef4444';
  const statusTextLao = isPaid ? 'ການຊໍາລະເງິນຖືກຢືນຢັນແລ້ວ' : 'ການຊໍາລະເງິນບໍ່ຜ່ານການຢືນຢັນ';
  const statusTextEng = isPaid ? 'Payment Confirmed' : 'Payment Failed';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 600px; width: 100%;">
            
            <!-- Header Banner -->
            <tr>
              <td style="background-color: #1e293b; padding: 30px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 1px;">MAISON DE NONGKHIAW</h1>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase;">Luxury Resort & Retreat</p>
              </td>
            </tr>

            <!-- Status Badge -->
            <tr>
              <td style="padding: 30px 30px 10px 30px; text-align: center;">
                <div style="display: inline-block; background-color: ${isPaid ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${statusColor}; padding: 8px 18px; border-radius: 50px;">
                  <span style="color: ${statusColor}; font-weight: 600; font-size: 14px;">
                    ${statusTextLao} / ${statusTextEng}
                  </span>
                </div>
              </td>
            </tr>

            <!-- Body Content -->
            <tr>
              <td style="padding: 20px 30px; color: #334155; line-height: 1.6;">
                <p style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">
                  ສະບາຍດີ / Dear ${customerName || 'Valued Guest'},
                </p>
                
                ${
                  isPaid
                    ? `<p style="margin-top: 0;">
                        ບັນຊີຊໍາລະຂອງທ່ານສໍາລັບການຈອງ <strong>#${bookingId}</strong> ໄດ້ຮັບການຢືນຢັນຮຽບຮ້ອຍແລ້ວ. ພວກເຂົາເຈົ້າມີຄວາມຍິນດີທີ່ຈະຕ້ອນຮັບທ່ານ.<br>
                        <span style="color: #64748b; font-size: 14px;">Your payment for booking <strong>#${bookingId}</strong> has been successfully verified. We look forward to welcoming you!</span>
                       </p>`
                    : `<p style="margin-top: 0;">
                        ການຊໍາລະເງິນສໍາລັບການຈອງ <strong>#${bookingId}</strong> ບໍ່ຜ່ານການຢືນຢັນ.<br>
                        <span style="color: #64748b; font-size: 14px;">Your payment verification for booking <strong>#${bookingId}</strong> was unsuccessful.</span>
                       </p>
                       <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 12px 15px; margin: 15px 0; border-radius: 4px;">
                         <strong style="color: #9f1239;">ເຫດຜົນ / Reason:</strong> ${reason}
                       </div>`
                }

                <!-- Booking Summary Card -->
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border-radius: 8px; margin: 20px 0; padding: 15px;">
                  <tr>
                    <td style="padding: 8px; font-size: 14px; color: #64748b;">Booking Reference:</td>
                    <td style="padding: 8px; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">#${bookingId}</td>
                  </tr>
                </table>

                <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 25px;">
                  ຫາກມີຂໍ້ສົງໄສ ກະລຸນາຕິດຕໍ່ທີມງານຂອງພວກເຮົາ.<br>If you have any questions, feel free to contact us.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 5px 0; font-weight: 600; color: #64748b;">Maison de Nongkhiaw Resort</p>
                <p style="margin: 0;">Nongkhiaw, Luang Prabang, Lao PDR</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}