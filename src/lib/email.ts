import nodemailer from 'nodemailer'

interface SendCredentialsEmailParams {
  to: string
  fullName: string
  password: string
  role: string
  loginUrl?: string
}

export async function sendMemberCredentialsEmail({
  to,
  fullName,
  password,
  role,
  loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/login',
}: SendCredentialsEmailParams): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpFrom = process.env.SMTP_FROM || 'TUSU Workspace <onboarding@resend.dev>'

  // Check if Resend API Key is provided
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: smtpFrom.includes('@') ? smtpFrom : 'TUSU Workspace <onboarding@resend.dev>',
          to: [to],
          subject: `Your TUSU Workspace Account Credentials [${fullName}]`,
          html: getEmailHtml({ fullName, to, password, role, loginUrl }),
          text: `Hello ${fullName},\n\nYour TUSU Workspace account has been created.\n\nRole: ${role}\nLogin URL: ${loginUrl}\nAccount ID (Email): ${to}\nTemporary Password: ${password}\n\nPlease log in and update your password.`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error('Resend API error:', data)
        return { sent: false, error: data.message || 'Resend API error' }
      }
      return { sent: true, messageId: data.id }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send via Resend'
      console.error('Resend send error:', errorMsg)
      return { sent: false, error: errorMsg }
    }
  }

  // Check if SMTP is configured
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log('\n========================================')
    console.log('📧 [MEMBER CREATION CREDENTIALS EMAIL]')
    console.log(`To: ${fullName} <${to}>`)
    console.log(`Role: ${role}`)
    console.log(`Login URL: ${loginUrl}`)
    console.log(`Account ID (Email): ${to}`)
    console.log(`Temporary Password: ${password}`)
    console.log('Notice: Email was NOT sent over the internet because no email provider is configured in .env.local.')
    console.log('To send real emails, set either SMTP credentials (e.g. Gmail) or RESEND_API_KEY in .env.local.')
    console.log('========================================\n')

    return { sent: false, error: 'Email service credentials not configured in .env.local' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    const htmlContent = getEmailHtml({ fullName, to, password, role, loginUrl })

    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: `Your TUSU Workspace Account Credentials [${fullName}]`,
      text: `Hello ${fullName},\n\nYour TUSU Workspace account has been created.\n\nRole: ${role}\nLogin URL: ${loginUrl}\nAccount ID (Email): ${to}\nTemporary Password: ${password}\n\nPlease log in and update your password.`,
      html: htmlContent,
    })

    return { sent: true, messageId: info.messageId }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to send email'
    console.error('SMTP Email send error:', errorMsg)
    return { sent: false, error: errorMsg }
  }
}

function getEmailHtml({
  fullName,
  to,
  password,
  role,
  loginUrl,
}: {
  fullName: string
  to: string
  password: string
  role: string
  loginUrl: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your TUSU Workspace Account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e4e4e7; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <div style="display: flex; align-items: center; margin-bottom: 24px;">
      <div style="background-color: #6366f1; width: 40px; height: 40px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: 20px; text-align: center; line-height: 40px;">
        T
      </div>
      <span style="font-size: 18px; font-weight: 700; color: #18181b; margin-left: 12px;">TUSU Workspace</span>
    </div>

    <h2 style="font-size: 20px; font-weight: 700; color: #18181b; margin-bottom: 8px;">Welcome to the Team, ${fullName}!</h2>
    <p style="color: #71717a; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
      Your workspace administrator has created an account for you with the role of <strong>${role.toUpperCase()}</strong>. You can now log in to collaborate, manage tasks, and chat with your teammates.
    </p>

    <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #71717a; letter-spacing: 0.5px;">Your Login Credentials</p>
      
      <div style="margin-bottom: 12px;">
        <span style="font-size: 13px; color: #71717a; display: block;">Account ID (Email):</span>
        <strong style="font-size: 15px; color: #18181b;">${to}</strong>
      </div>

      <div>
        <span style="font-size: 13px; color: #71717a; display: block;">Temporary Password:</span>
        <code style="display: inline-block; background: #e0e7ff; color: #4338ca; font-size: 15px; font-weight: 600; padding: 4px 10px; border-radius: 6px; font-family: monospace;">${password}</code>
      </div>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${loginUrl}" style="background-color: #6366f1; color: #ffffff; display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);">
        Log In to TUSU Workspace
      </a>
    </div>

    <p style="font-size: 12px; color: #a1a1aa; line-height: 1.5; text-align: center; margin: 0;">
      We recommend changing your password after your first login.<br>
      © ${new Date().getFullYear()} TUSU Workspace. All rights reserved.
    </p>
  </div>
</body>
</html>
`
}
