# 📋 OneSync - Aplicação Local

Plataforma integrada para gerenciar 1:1, PDI e acompanhamento de colaboradores com **backend Python (FastAPI)** e **frontend React (Vite + Material UI)**.

## 🎨 Opções de logotipo

- `frontend/src/assets/onesync-logo-orbit.svg` (padrão aplicado na UI)
- `frontend/src/assets/onesync-logo-sync.svg`
- `frontend/src/assets/onesync-logo-pulse.svg`

---

## 🏗️ Arquitetura

### Backend (Python + FastAPI)
- **Vertical Slice**: `/slices/collaborators`, `/slices/one_on_ones`, `/slices/pdis`, `/slices/reporting`
- **Domínio**: Entidades com comportamento (sem anêmicos)
- **Database**: PostgreSQL via Docker Compose
- **API**: RESTful com OpenAPI Docs

### Frontend (React + Vite)
- **Material UI**: Designer fluido e responsivo
- **Axios**: Cliente API integrado
- **React Router**: Navegação SPA
- **Layout**: Dashboard + Colaboradores (expansível)

---

## 🚀 Execução Rápida

### Pré-setup automático (Windows)
Se faltar `docker`, execute:
```bash
python bootstrap_windows.py
```
O script verifica dependências e oferece instalação via `winget`.

### Subida oficial da aplicação
```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend/API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`

> Este projeto usa bypass de registry por padrão no local (`mirror.gcr.io/library/`) para evitar erro `403 Forbidden` no Docker Hub.
>
> Para forçar Docker Hub direto em uma execução:
> ```bash
> REGISTRY_PREFIX= docker compose up --build
> ```

Para parar:
```bash
docker compose down
```

Para importar colaboradores do CSV via Docker:
```bash
docker compose --profile tools run --rm seed
```

Na tela de colaboradores também é possível:
- baixar um modelo CSV
- importar em massa atualizando registros existentes
- enriquecer cargo e foco automaticamente com base nos arquivos `.txt` da pasta `people`

---

## 🔌 Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/collaborators` | Lista todos os colaboradores |
| POST | `/api/collaborators` | Cria novo colaborador |
| PATCH | `/api/collaborators/{id}/risk` | Escalona/reduz risco |
| POST | `/api/collaborators/{id}/start-pdi` | Inicia PDI |
| POST | `/api/one-on-ones` | Registra 1:1 |
| GET | `/api/one-on-ones/collaborator/{id}` | Histórico 1:1 |
| POST | `/api/pdis` | Cria/atualiza PDI |
| GET | `/api/pdis/collaborator/{id}` | PDIs do colaborador |
| GET | `/api/reporting/dashboard` | Resumo do dashboard |
| GET | `/api/reporting/risk-breakdown` | Distribuição de riscos |

---

## 🎨 Features Implementadas

✅ **Dashboard** - Visão consolidada com cards de métricas  
✅ **Colaboradores** - CRUD com gestão de risco (BAIXO/MÉDIO/ALTO)  
✅ **1:1s** - Registro com mood score e próximos passos  
✅ **PDIs** - Criação e rastreamento de progresso  
✅ **Reporting** - Sumário e breakdown de riscos  

---

## 📈 Próximos Passos (Roadmap)

1. **Melhorias UX**
   - [ ] Listagem com filtros e paginação
   - [ ] Gráficos interativos (Recharts)
   - [ ] Timeline de 1:1 por colaborador

2. **Novos Slices**
   - [ ] Metas/Goals com associação a PDI
   - [ ] Feedback 360°
   - [ ] Planos de ação com tasks

3. **Backend**
   - [ ] Autenticação (JWT)
   - [ ] Auditoria de mudanças
   - [ ] Webhooks para automações

4. **Deployment**
   - [ ] Docker Compose para local
   - [ ] CI/CD com GitHub Actions
   - [ ] Migração para AWS (RDS, S3, Lambda)

---

## 🔧 Stack Utilizada

**Backend:**
- FastAPI 0.115
- SQLAlchemy 2.0
- SQLite 3.x
- Pydantic v2

**Frontend:**
- React 18.3
- Material-UI 5.16
- Vite 5.0
- React Router 6.28
- Axios 1.7

---

## 📝 Estrutura de Diretórios

```
people-app/
├── backend/
│   ├── app/
│   │   ├── core/          # config, database
│   │   ├── main.py        # FastAPI app
│   │   └── slices/
│   │       ├── collaborators/  # domain, infrastructure, application, api
│   │       ├── one_on_ones/
│   │       ├── pdis/
│   │       └── reporting/
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/           # client.js (axios)
│   │   ├── pages/         # Dashboard, Collaborators
│   │   ├── components/    # Layout
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── run_backend.py
├── run_frontend.py
├── run_all.py
└── README.md
```

---

## ⚙️ Variáveis de Ambiente

### Backend (`.env`)
```
DATABASE_URL=sqlite:///./people.db
ENVIRONMENT=local
CORS_ORIGINS=["http://localhost:5173"]
```

### Frontend
Axios usa `http://localhost:8000/api` automaticamente.

---

## 🐛 Troubleshooting

**Backend não conecta ao frontend?**
- Verifique CORS em `backend/.env`
- Certifique-se que backend está em `0.0.0.0:8000`

**Frontend não carrega a API?**
- Confirme que backend está rodando
- Verifique URL em `frontend/src/api/client.js`

**Banco de dados não cria?**
- Delete `backend/people.db` e reinicie
- Verifique permissões de escrita

---

## 📄 Licença

MIT

---

**Desenvolvido com ❤️ para gestão integrada de 1:1 e PDI**
