import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOtpEmail(to: string, otp: string) {
  await resend.emails.send({
    from: "Resort MDNK1 <noreply@yourdomain.com>",
    to,
    subject: "ລະຫັດ OTP ສຳລັບຣີເຊັດລະຫັດຜ່ານ",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Resort MDNK1</h2>
        <p>ລະຫັດ OTP ຂອງທ່ານແມ່ນ:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">
          ${otp}
        </p>
        <p style="color: #666; font-size: 14px;">
          ລະຫັດນີ້ຈະໝົດອາຍຸໃນ 5 ນາທີ. ຖ້າທ່ານບໍ່ໄດ້ຮ້ອງຂໍ ກະລຸນາລະເວັ້ນອີເມວນີ້.
        </p>
      </div>
    `,
  })
}