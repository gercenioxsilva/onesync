import csv
import io
import os
from pathlib import Path
import re
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.email import notify_new_collaborator
from app.slices.collaborators.domain.entities import RiskLevel
from app.slices.collaborators.infrastructure.models import CollaboratorModel
from app.slices.collaborators.infrastructure.repositories import CollaboratorRepository
from app.slices.one_on_ones.infrastructure.models import OneOnOneModel
from app.slices.pdis.infrastructure.models import PdiModel
from app.slices.tenants.infrastructure.models import TenantModel


class CollaboratorService:
    TXT_GLOB_PATTERNS = ("*.txt", "**/*.txt")

    def __init__(self, db: Session):
        self.repo = CollaboratorRepository(db)
        self.db = db

    @staticmethod
    def build_csv_template() -> str:
        return (
            "nome,email,squad,tech_lead_id,papel,principal_foco,risco,status_pdi\n"
            "ALEXANDRE,alexandre@empresa.com,Squad Onboarding,,FRONT END SR,Evoluir arquitetura do BFF,BAIXO,NO_PLANO\n"
            "ANA,ana@empresa.com,Squad Onboarding,,ENGENHEIRA DE SOFTWARE,Fortalecer atuação funcional,MEDIO,EM_ANDAMENTO\n"
        )

    @staticmethod
    def _normalize_key(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value or "")
        ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
        return "".join(char.lower() for char in ascii_value if char.isalnum() or char == "_")

    @staticmethod
    def _pick_value(row: dict[str, str], *aliases: str) -> str:
        for alias in aliases:
            value = row.get(alias)
            if value is not None and str(value).strip():
                return str(value).strip()
        return ""

    @staticmethod
    def _normalize_risk(value: str) -> str:
        normalized = CollaboratorService._normalize_key(value)
        mapping = {
            "baixo": "BAIXO",
            "low": "BAIXO",
            "medio": "MEDIO",
            "mediorisco": "MEDIO",
            "medium": "MEDIO",
            "alto": "ALTO",
            "high": "ALTO",
        }
        return mapping.get(normalized, "BAIXO")

    @staticmethod
    def _normalize_email(value: str) -> str:
        normalized = (value or "").strip().lower()
        if not normalized:
            return ""
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", normalized):
            raise ValueError("Email do colaborador inválido")
        return normalized

    @staticmethod
    def _normalize_pdi_status(value: str) -> str:
        normalized = CollaboratorService._normalize_key(value)
        mapping = {
            "": "NO_PLANO",
            "noplano": "NO_PLANO",
            "semplano": "NO_PLANO",
            "naoiniciado": "NO_PLANO",
            "emandamento": "EM_ANDAMENTO",
            "emprogresso": "EM_ANDAMENTO",
            "inprogress": "EM_ANDAMENTO",
            "atencao": "ATENCAO",
            "attention": "ATENCAO",
            "concluido": "CONCLUIDO",
            "done": "CONCLUIDO",
        }
        return mapping.get(normalized, "NO_PLANO")

    @staticmethod
    def _normalize_name(value: str) -> str:
        normalized = CollaboratorService._normalize_key(value)
        normalized = normalized.replace("tl", "")
        return normalized.strip("_")

    @staticmethod
    def _read_text_file(file_path: Path) -> str:
        for encoding in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                return file_path.read_text(encoding=encoding)
            except UnicodeDecodeError:
                continue
        return file_path.read_text(errors="ignore")

    @staticmethod
    def _extract_name_from_txt_path(file_path: Path) -> str:
        stem = file_path.stem.upper()
        stem = re.sub(r"^\d+(?:_\d+)*_+", "", stem)
        stem = stem.replace("__", "_")
        stem = re.sub(r"_\d+$", "", stem)
        stem = stem.replace("1_1_", "").replace("1_2_", "")
        stem = stem.replace("TL_", "")
        stem = stem.replace("_", " ").strip()
        return stem

    @classmethod
    def _parse_txt_metadata(cls, file_path: Path) -> tuple[str, dict[str, str]]:
        text = cls._read_text_file(file_path)
        name = cls._extract_name_from_txt_path(file_path)
        metadata = {"role": "", "focus": ""}

        role_keys = {
            "resp",
            "responsabilidades",
            "responsabilidade",
            "papel",
            "cargo",
            "responsavel",
        }
        focus_keys = {
            "principalfoco",
            "foco",
            "qualademandavoceestaatuando",
            "emquejornadavoceestaatuando",
            "qualprodutodeatendimentovoceestafocado",
            "omeuprojetoeovisao360",
            "oprojeto",
            "oqueestaatuando",
        }

        for raw_line in text.splitlines():
            line = raw_line.strip().lstrip("#").strip()
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            normalized_key = cls._normalize_key(key)
            value = value.strip()
            if not value:
                continue
            if normalized_key in role_keys and not metadata["role"]:
                metadata["role"] = value
            if normalized_key in focus_keys and not metadata["focus"]:
                metadata["focus"] = value

        return name, metadata

    @classmethod
    def _load_txt_metadata_map(cls) -> dict[str, dict[str, str]]:
        source_dir = os.getenv("PEOPLE_SOURCE_DIR", "")
        if not source_dir:
            return {}

        root = Path(source_dir)
        if not root.exists():
            return {}

        metadata_map: dict[str, dict[str, str]] = {}
        for pattern in cls.TXT_GLOB_PATTERNS:
            for file_path in root.glob(pattern):
                if not file_path.is_file() or file_path.suffix.lower() != ".txt":
                    continue
                if "people-app" in file_path.parts:
                    continue
                name, metadata = cls._parse_txt_metadata(file_path)
                normalized_name = cls._normalize_name(name)
                if not normalized_name:
                    continue
                existing = metadata_map.get(normalized_name, {"role": "", "focus": ""})
                if metadata.get("role") and not existing.get("role"):
                    existing["role"] = metadata["role"]
                if metadata.get("focus") and not existing.get("focus"):
                    existing["focus"] = metadata["focus"]
                metadata_map[normalized_name] = existing
        return metadata_map

    @classmethod
    def _apply_txt_enrichment(
        cls,
        model: CollaboratorModel,
        txt_metadata_map: dict[str, dict[str, str]],
    ) -> bool:
        metadata = txt_metadata_map.get(cls._normalize_name(model.name))
        if not metadata:
            return False

        changed = False
        if metadata.get("role") and not model.role.strip():
            model.role = metadata["role"].strip()
            changed = True
        if metadata.get("focus") and not model.focus.strip():
            model.focus = metadata["focus"].strip()
            changed = True
        return changed

    @staticmethod
    def _merge_value(current: str, incoming: str) -> str:
        return incoming.strip() if incoming and incoming.strip() else current

    def _validate_tech_lead(
        self,
        tenant_id: str,
        collaborator_id: str | None,
        tech_lead_id: str | None,
    ) -> str | None:
        if not tech_lead_id:
            return None

        leader = self.repo.get_by_id(tenant_id, tech_lead_id)
        if not leader:
            raise ValueError("Tech Lead informado não encontrado para este tenant")
        if collaborator_id and collaborator_id == tech_lead_id:
            raise ValueError("Colaborador não pode ser o próprio Tech Lead")
        return tech_lead_id

    def create(
        self,
        tenant_id: str,
        name: str,
        email: str = "",
        squad: str = "",
        tech_lead_id: str | None = None,
        role: str = "",
        focus: str = "",
    ) -> CollaboratorModel:
        model = CollaboratorModel(
            tenant_id=tenant_id,
            name=name.strip(),
            email=self._normalize_email(email),
            squad=squad.strip(),
            tech_lead_id=self._validate_tech_lead(tenant_id, None, tech_lead_id),
            role=role.strip(),
            focus=focus.strip(),
        )
        saved = self.repo.add(model)

        tenant = self.db.get(TenantModel, tenant_id)
        notify_new_collaborator(
            collaborator_email=saved.email,
            collaborator_name=saved.name,
            company_name=tenant.name if tenant else "",
        )

        return saved

    def import_from_csv(
        self,
        tenant_id: str,
        content: bytes,
        *,
        update_existing: bool = False,
        enrich_from_txt: bool = True,
    ) -> dict[str, object]:
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise ValueError("CSV inválido: cabeçalho não encontrado")

        imported = 0
        updated = 0
        skipped = 0
        enriched_from_txt = 0
        errors: list[str] = []
        txt_metadata_map = self._load_txt_metadata_map() if enrich_from_txt else {}

        normalized_fieldnames = [self._normalize_key(field) for field in reader.fieldnames]
        if not any(field in {"nome", "name"} for field in normalized_fieldnames):
            raise ValueError("CSV inválido: informe ao menos a coluna 'nome' ou 'name'")

        for index, raw_row in enumerate(reader, start=2):
            row = {self._normalize_key(key): (value or "") for key, value in raw_row.items()}
            name = self._pick_value(row, "nome", "name")
            if not name:
                skipped += 1
                errors.append(f"Linha {index}: nome não informado")
                continue

            role = self._pick_value(row, "papel", "cargo", "role")
            email = self._pick_value(row, "email", "e_mail", "mail")
            squad = self._pick_value(row, "squad", "time")
            tech_lead_id = self._pick_value(row, "tech_lead_id", "techleadid", "tl_id") or None
            focus = self._pick_value(row, "principal_foco", "foco", "focus")
            risk = self._normalize_risk(self._pick_value(row, "risco", "risk"))
            pdi_status = self._normalize_pdi_status(
                self._pick_value(row, "status_pdi", "pdistatus", "pdi_status")
            )

            try:
                email = self._normalize_email(email)
            except ValueError as exc:
                skipped += 1
                errors.append(f"Linha {index}: {exc}")
                continue

            existing = self.repo.get_by_name(tenant_id, name)
            if existing:
                if not update_existing:
                    skipped += 1
                    if enrich_from_txt and self._apply_txt_enrichment(existing, txt_metadata_map):
                        enriched_from_txt += 1
                    continue

                existing.role = self._merge_value(existing.role, role)
                existing.email = self._merge_value(existing.email, email)
                existing.squad = self._merge_value(existing.squad, squad)
                existing.focus = self._merge_value(existing.focus, focus)
                existing.tech_lead_id = self._validate_tech_lead(
                    tenant_id,
                    existing.id,
                    tech_lead_id or existing.tech_lead_id,
                )
                if self._pick_value(row, "risco", "risk"):
                    existing.risk = risk
                if self._pick_value(row, "status_pdi", "pdistatus", "pdi_status"):
                    existing.pdi_status = pdi_status
                if enrich_from_txt and self._apply_txt_enrichment(existing, txt_metadata_map):
                    enriched_from_txt += 1
                updated += 1
                continue

            model = CollaboratorModel(
                tenant_id=tenant_id,
                name=name,
                email=email,
                squad=squad,
                tech_lead_id=self._validate_tech_lead(tenant_id, None, tech_lead_id),
                role=role,
                focus=focus,
                risk=risk,
                pdi_status=pdi_status,
            )
            if enrich_from_txt and self._apply_txt_enrichment(model, txt_metadata_map):
                enriched_from_txt += 1
            self.repo.db.add(model)
            imported += 1

        self.repo.db.commit()
        return {
            "imported": imported,
            "updated": updated,
            "skipped": skipped,
            "enriched_from_txt": enriched_from_txt,
            "errors": errors,
        }

    def list_all(self, tenant_id: str) -> list[CollaboratorModel]:
        return self.repo.list_all(tenant_id)

    def _enrich_collaborator(self, collaborator: CollaboratorModel) -> dict:
        """Add next_one_on_one and progress to a collaborator dict"""
        # Get next 1:1
        next_one_on_one = self.db.scalar(
            select(OneOnOneModel.next_meeting_date)
            .where(OneOnOneModel.collaborator_id == collaborator.id)
            .where(OneOnOneModel.next_meeting_date.isnot(None))
            .order_by(OneOnOneModel.next_meeting_date.desc())
            .limit(1)
        )

        # Get latest PDI (progress + status)
        latest_pdi = self.db.execute(
            select(PdiModel.progress, PdiModel.status)
            .where(
                (PdiModel.collaborator_id == collaborator.id)
                & (PdiModel.tenant_id == collaborator.tenant_id)
            )
            .order_by(PdiModel.updated_at.desc(), PdiModel.created_at.desc())
            .limit(1)
        ).first()

        latest_progress = (latest_pdi[0] if latest_pdi else 0) or 0
        latest_status = latest_pdi[1] if latest_pdi else None
        resolved_pdi_status = (
            "NO_PLANO"
            if latest_status == "NAO_INICIADO"
            else latest_status or collaborator.pdi_status
        )

        collab_dict = {
            "id": collaborator.id,
            "tenant_id": collaborator.tenant_id,
            "name": collaborator.name,
            "email": collaborator.email,
            "squad": collaborator.squad,
            "tech_lead_id": collaborator.tech_lead_id,
            "role": collaborator.role,
            "focus": collaborator.focus,
            "risk": collaborator.risk,
            "pdi_status": resolved_pdi_status,
            "next_one_on_one": next_one_on_one.isoformat() if next_one_on_one else None,
            "progress": latest_progress,
            "updated_at": collaborator.updated_at,
        }
        return collab_dict

    def list_all_enriched(self, tenant_id: str) -> list[dict]:
        """List all collaborators with next_one_on_one and progress enriched"""
        collaborators = self.list_all(tenant_id)
        return [self._enrich_collaborator(c) for c in collaborators]

    def get_by_id_enriched(self, tenant_id: str, collaborator_id: str) -> dict:
        """Get a collaborator with next_one_on_one and progress enriched"""
        collaborator = self.repo.get_by_id(tenant_id, collaborator_id)
        if not collaborator:
            raise ValueError("Colaborador não encontrado")
        return self._enrich_collaborator(collaborator)

    def update(
        self,
        tenant_id: str,
        collaborator_id: str,
        name: str,
        email: str = "",
        squad: str = "",
        tech_lead_id: str | None = None,
        role: str = "",
        focus: str = "",
    ) -> CollaboratorModel:
        model = self.repo.get_by_id(tenant_id, collaborator_id)
        if not model:
            raise ValueError("Colaborador não encontrado")

        model.name = name.strip()
        model.email = self._normalize_email(email)
        model.squad = squad.strip()
        model.tech_lead_id = self._validate_tech_lead(tenant_id, model.id, tech_lead_id)
        model.role = role.strip()
        model.focus = focus.strip()
        return self.repo.save(model)

    def delete(self, tenant_id: str, collaborator_id: str) -> None:
        model = self.repo.get_by_id(tenant_id, collaborator_id)
        if not model:
            raise ValueError("Colaborador não encontrado")
        self.repo.delete(model)

    def change_risk(self, tenant_id: str, collaborator_id: str, action: str) -> CollaboratorModel:
        model = self.repo.get_by_id(tenant_id, collaborator_id)
        if not model:
            raise ValueError("Colaborador não encontrado")

        domain = self.repo.to_domain(model)
        if action == "escalate":
            domain.escalate_risk()
        elif action == "reduce":
            domain.reduce_risk()
        else:
            raise ValueError("Ação de risco inválida")

        model.risk = RiskLevel(domain.risk).value
        return self.repo.save(model)

    def start_pdi(self, tenant_id: str, collaborator_id: str) -> CollaboratorModel:
        model = self.repo.get_by_id(tenant_id, collaborator_id)
        if not model:
            raise ValueError("Colaborador não encontrado")

        domain = self.repo.to_domain(model)
        domain.start_pdi()
        model.pdi_status = domain.pdi_status.value
        return self.repo.save(model)
