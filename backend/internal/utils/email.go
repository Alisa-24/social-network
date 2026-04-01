package utils

import (
	"fmt"
	"net/smtp"
	"os"
	"strconv"
)

// SendOTPEmail sends a verification OTP to the given email address.
func SendOTPEmail(toEmail, toName, code string) error {
	host := os.Getenv("SMTP_HOST")
	portStr := os.Getenv("SMTP_PORT")
	sender := os.Getenv("SENDER_EMAIL")
	password := os.Getenv("SENDER_PASSWORD")

	port, err := strconv.Atoi(portStr)
	if err != nil || port == 0 {
		port = 587
	}

	auth := smtp.PlainAuth("", sender, password, host)

	subject := "Your Verification Code"
	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111113;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#000d0b 0%%,#002e28 40%%,#001830 75%%,#000d0b 100%%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#00d1b2;font-size:22px;letter-spacing:2px;text-transform:uppercase;font-weight:800;">Account Verification</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;text-align:center;">
            <p style="color:#a1a1aa;font-size:15px;margin:0 0 24px;">Hi <strong style="color:#f4f4f5;">%s</strong>, use the code below to verify your account.</p>
            <!-- OTP Box -->
            <div style="display:inline-block;background:#09090b;border:2px solid #00d1b2;border-radius:12px;padding:20px 40px;margin:0 0 24px;">
              <span style="font-size:42px;font-weight:900;letter-spacing:12px;color:#00d1b2;font-family:'Courier New',monospace;">%s</span>
            </div>
            <p style="color:#71717a;font-size:13px;margin:0;">This code expires in <strong style="color:#a1a1aa;">10 minutes</strong>.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #27272a;padding:20px 40px;text-align:center;">
            <p style="color:#52525b;font-size:12px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`, toName, code)

	msg := fmt.Sprintf(
		"From: Reboot Social <%s>\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		sender, toEmail, subject, body,
	)

	addr := fmt.Sprintf("%s:%d", host, port)
	return smtp.SendMail(addr, auth, sender, []string{toEmail}, []byte(msg))
}
