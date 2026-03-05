interface BaseTemplateOptions {
    title: string;
    content: string;
    preheader?: string;
}

export function baseTemplate(options: BaseTemplateOptions): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'SaviEduTech';
    const preheader = options.preheader || options.title;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${options.title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 20px !important; }
      .header { padding: 20px !important; }
      .content { padding: 20px !important; }
      .button { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <tr>
            <td class="header" style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px 40px; text-align: center;">
              <a href="${appUrl}" style="text-decoration: none;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                  ${appName}
                </h1>
              </a>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                Your Path to Success
              </p>
            </td>
          </tr>
          <tr>
            <td class="content" style="padding: 40px;">
              ${options.content}
            </td>
          </tr>
          <tr>
            <td style="background: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">
                Follow us for updates and tips:
              </p>
              <div style="margin-bottom: 24px;">
                <a href="#" style="display: inline-block; margin: 0 8px; color: #64748b; text-decoration: none; font-size: 14px;">Twitter</a>
                <a href="#" style="display: inline-block; margin: 0 8px; color: #64748b; text-decoration: none; font-size: 14px;">LinkedIn</a>
                <a href="#" style="display: inline-block; margin: 0 8px; color: #64748b; text-decoration: none; font-size: 14px;">YouTube</a>
                <a href="#" style="display: inline-block; margin: 0 8px; color: #64748b; text-decoration: none; font-size: 14px;">Instagram</a>
              </div>
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                You're receiving this email because you have an account on ${appName}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
