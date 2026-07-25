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

export async function sendBookingConfirmation({
  to,
  customerName,
  bookingId,
  roomName,
  checkIn,
  checkOut,
  guests,
  totalPrice,
}: {
  to: string
  customerName: string
  bookingId: string
  roomName: string
  checkIn: string
  checkOut: string
  guests: number
  totalPrice: number
}) {
  await resend.emails.send({
    from: "Resort Maison De Nongkhiaw <noreply@yourdomain.com>",
    to,
    subject: "🎉 Booking Confirmation",

    html: `
      <div style="font-family:Arial,sans-serif">

      <h2>🏨 Resort Maison De Nongkhiaw</h2>

      <h3>Booking Confirmation</h3>

      <p>Hello <b>${customerName}</b></p>

      <p>Your booking has been received.</p>

      <hr>

      <p><b>Booking ID :</b> ${bookingId}</p>

      <p><b>Room :</b> ${roomName}</p>

      <p><b>Check In :</b> ${checkIn}</p>

      <p><b>Check Out :</b> ${checkOut}</p>

      <p><b>Guests :</b> ${guests}</p>

      <p><b>Total :</b> ${totalPrice.toLocaleString()} Kip</p>

      <hr>

      <p style="color:orange;font-weight:bold">
      Status : Waiting for Confirmation
      </p>

      </div>
    `,
  })
}