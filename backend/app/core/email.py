import logging
import threading
from datetime import date

from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_via_ses(to_address: str, subject: str, html_body: str, text_body: str) -> None:
    if not settings.notifications_enabled or not settings.ses_from_email:
        return
    if not to_address:
        return
    try:
        import boto3
        from botocore.exceptions import ClientError

        client = boto3.client("ses", region_name=settings.ses_region)
        client.send_email(
            Source=settings.ses_from_email,
            Destination={"ToAddresses": [to_address]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                    "Text": {"Data": text_body, "Charset": "UTF-8"},
                },
            },
        )
        logger.info("Email sent to %s: %s", to_address, subject)
    except Exception as exc:
        logger.error("Error sending email to %s: %s", to_address, exc)


def _fire(to_address: str, subject: str, html_body: str, text_body: str) -> None:
    threading.Thread(
        target=_send_via_ses,
        args=(to_address, subject, html_body, text_body),
        daemon=True,
    ).start()


def notify_one_on_one(
    collaborator_email: str,
    collaborator_name: str,
    meeting_date: date,
    next_steps: str,
    next_meeting_date: date | None,
) -> None:
    if not collaborator_email:
        return

    fmt_date = meeting_date.strftime("%d/%m/%Y")
    fmt_next = next_meeting_date.strftime("%d/%m/%Y") if next_meeting_date else "a definir"
    subject = f"[OneSync] 1:1 registrado — {fmt_date}"

    html_body = f"""<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.14);">
        <tr>
          <td style="background:linear-gradient(135deg,#0F172A,#172554);padding:32px 40px;">
            <p style="margin:0;color:rgba(255,255,255,.6);font-size:12px;text-transform:uppercase;letter-spacing:1px;">OneSync</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:24px;">1:1 Registrado</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:32px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Olá, <strong>{collaborator_name}</strong>!</p>
            <p style="margin:0 0 24px;color:#475569;">Um 1:1 foi registrado para você em <strong>{fmt_date}</strong>.</p>
            <div style="background:#f8fafc;border-left:4px solid #3b82f6;border-radius:4px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:.5px;">Próximos passos</p>
              <p style="margin:0;color:#1e293b;white-space:pre-wrap;line-height:1.6;">{next_steps}</p>
            </div>
            <p style="margin:0 0 32px;color:#64748b;font-size:14px;">Próxima reunião: <strong style="color:#1e293b;">{fmt_next}</strong></p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Você recebeu este email porque está cadastrado na plataforma OneSync.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    text_body = (
        f"OneSync — 1:1 Registrado\n\n"
        f"Olá, {collaborator_name}!\n"
        f"Um 1:1 foi registrado em {fmt_date}.\n\n"
        f"Próximos passos:\n{next_steps}\n\n"
        f"Próxima reunião: {fmt_next}"
    )

    _fire(collaborator_email, subject, html_body, text_body)


def notify_pdi(
    collaborator_email: str,
    collaborator_name: str,
    cycle: str,
    objective: str,
    status: str,
) -> None:
    if not collaborator_email:
        return

    status_meta = {
        "NAO_INICIADO": ("Não iniciado", "#f59e0b"),
        "EM_ANDAMENTO": ("Em andamento", "#3b82f6"),
        "CONCLUIDO": ("Concluído", "#22c55e"),
    }
    status_label, status_color = status_meta.get(status, (status, "#64748b"))
    subject = f"[OneSync] PDI registrado — Ciclo {cycle}"

    html_body = f"""<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.14);">
        <tr>
          <td style="background:linear-gradient(135deg,#0F172A,#172554);padding:32px 40px;">
            <p style="margin:0;color:rgba(255,255,255,.6);font-size:12px;text-transform:uppercase;letter-spacing:1px;">OneSync</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:24px;">PDI Registrado</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:32px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Olá, <strong>{collaborator_name}</strong>!</p>
            <p style="margin:0 0 24px;color:#475569;">Um Plano de Desenvolvimento Individual foi registrado para você.</p>
            <div style="background:#f8fafc;border-left:4px solid {status_color};border-radius:4px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:.5px;">Ciclo</p>
              <p style="margin:0 0 16px;color:#1e293b;font-weight:600;">{cycle}</p>
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:.5px;">Objetivo</p>
              <p style="margin:0 0 16px;color:#1e293b;white-space:pre-wrap;line-height:1.6;">{objective}</p>
              <span style="display:inline-block;background:{status_color};color:#fff;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:700;">{status_label}</span>
            </div>
            <p style="margin:0 0 32px;color:#64748b;font-size:14px;">Acesse a plataforma OneSync para acompanhar seu progresso.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Você recebeu este email porque está cadastrado na plataforma OneSync.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    text_body = (
        f"OneSync — PDI Registrado\n\n"
        f"Olá, {collaborator_name}!\n"
        f"Um PDI foi registrado para o ciclo {cycle}.\n\n"
        f"Objetivo:\n{objective}\n\n"
        f"Status: {status_label}"
    )

    _fire(collaborator_email, subject, html_body, text_body)
