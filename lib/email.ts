interface InviteEmailOptions {
  to: string;
  inviteUrl: string;
  orgName: string;
  deptName: string;
  inviterName: string;
}

export async function sendInviteEmail(opts: InviteEmailOptions): Promise<{ sent: boolean; reason?: string }> {
  const { to, inviteUrl, orgName, deptName, inviterName } = opts;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER ?? "";
  const smtpPass = process.env.SMTP_PASS ?? "";
  const smtpFrom = process.env.SMTP_FROM ?? `noreply@contentech.io`;

  if (!smtpHost) {
    console.log(`[Invite] SMTP not configured — invite link for ${to}: ${inviteUrl}`);
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodemailer = await (eval('import("nodemailer")') as Promise<any>).catch(() => null);
    if (!nodemailer) {
      console.log(`[Invite] nodemailer unavailable — invite link for ${to}: ${inviteUrl}`);
      return { sent: false, reason: "NODEMAILER_UNAVAILABLE" };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,sans-serif;background:#F5F8FA;padding:40px 0;margin:0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #CBD6E2;overflow:hidden">
    <div style="background:#2D3E50;padding:28px 32px">
      <p style="color:#fff;font-size:20px;font-weight:700;margin:0">Contentech</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#2D3E50;font-size:18px;font-weight:700;margin:0 0 12px">You have been invited</h2>
      <p style="color:#516F90;font-size:14px;line-height:1.6;margin:0 0 8px">
        <strong>${inviterName}</strong> has invited you to join the <strong>${deptName}</strong> department at <strong>${orgName}</strong> on Contentech.
      </p>
      <p style="color:#516F90;font-size:14px;line-height:1.6;margin:0 0 28px">
        Click the button below to accept the invitation. This link expires in 7 days.
      </p>
      <a href="${inviteUrl}" style="display:inline-block;background:#FF7A59;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px">
        Accept Invitation
      </a>
      <p style="color:#99ACC2;font-size:12px;margin:24px 0 0">
        Or copy this link: <span style="color:#0091AE">${inviteUrl}</span>
      </p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Contentech" <${smtpFrom}>`,
      to,
      subject: `${inviterName} invited you to ${deptName} on Contentech`,
      html,
    });

    return { sent: true };
  } catch (err) {
    console.error("[Invite] Email send failed:", err);
    return { sent: false, reason: String(err) };
  }
}
