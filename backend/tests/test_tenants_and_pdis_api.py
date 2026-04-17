def _create_collaborator(client, headers, name="Patrícia Lima", email="patricia@empresa.com"):
    response = client.post(
        "/api/collaborators",
        json={
            "name": name,
            "email": email,
            "squad": "Dados",
            "tech_lead_id": None,
            "role": "Analista",
            "focus": "Crescimento técnico",
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_tenant_read_and_update_flow(client, auth_headers):
    headers = auth_headers()

    get_response = client.get("/api/tenants/me", headers=headers)
    assert get_response.status_code == 200
    tenant = get_response.json()
    assert tenant["cnpj"] == "12345678000190"
    assert tenant["name"] == "Empresa Teste"

    update_response = client.patch(
        "/api/tenants/me",
        json={
            "name": "Empresa Teste Atualizada",
            "email": "novo-contato@teste.com",
            "address": "Rua Nova, 999",
            "phone": "+55 11 98888-7777",
            "collaborator_quota": 40,
        },
        headers=headers,
    )
    assert update_response.status_code == 200, update_response.text
    updated = update_response.json()
    assert updated["name"] == "Empresa Teste Atualizada"
    assert updated["email"] == "novo-contato@teste.com"
    assert updated["collaborator_quota"] == 40


def test_pdi_create_and_update_flow(client, auth_headers):
    headers = auth_headers()
    collaborator = _create_collaborator(client, headers)

    create_response = client.post(
        "/api/pdis",
        json={
            "collaborator_id": collaborator["id"],
            "cycle": "2026_H1",
            "objective": "Fortalecer liderança técnica",
            "progress": 10,
        },
        headers=headers,
    )
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["objective"] == "Fortalecer liderança técnica"
    assert created["status"] == "EM_ANDAMENTO"

    update_response = client.post(
        "/api/pdis",
        json={
            "collaborator_id": collaborator["id"],
            "cycle": "2026_H1",
            "objective": "Fortalecer liderança técnica e comunicação",
            "progress": 85,
        },
        headers=headers,
    )
    assert update_response.status_code == 201, update_response.text
    updated = update_response.json()
    assert updated["id"] == created["id"]
    assert updated["progress"] == 85
    assert updated["status"] == "CONCLUIDO"

    list_response = client.get(f"/api/pdis/collaborator/{collaborator['id']}", headers=headers)
    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed) == 1
    assert listed[0]["objective"] == "Fortalecer liderança técnica e comunicação"
