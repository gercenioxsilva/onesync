def test_collaborator_crud_flow(client, auth_headers, collaborator_payload):
    headers = auth_headers()

    create_response = client.post("/api/collaborators", json=collaborator_payload, headers=headers)
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    collaborator_id = created["id"]
    assert created["name"] == collaborator_payload["name"]
    assert created["email"] == collaborator_payload["email"]
    assert created["risk"] == "BAIXO"

    list_response = client.get("/api/collaborators", headers=headers)
    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed) == 1
    assert listed[0]["id"] == collaborator_id

    get_response = client.get(f"/api/collaborators/{collaborator_id}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["name"] == collaborator_payload["name"]

    update_payload = {
        **collaborator_payload,
        "name": "João Silva Atualizado",
        "email": "joao.silva@empresa.com",
        "focus": "Apoiar discovery",
    }
    update_response = client.put(
        f"/api/collaborators/{collaborator_id}",
        json=update_payload,
        headers=headers,
    )
    assert update_response.status_code == 200, update_response.text
    updated = update_response.json()
    assert updated["name"] == "João Silva Atualizado"
    assert updated["email"] == "joao.silva@empresa.com"
    assert updated["focus"] == "Apoiar discovery"

    risk_response = client.patch(
        f"/api/collaborators/{collaborator_id}/risk",
        json={"action": "escalate"},
        headers=headers,
    )
    assert risk_response.status_code == 200
    assert risk_response.json()["risk"] == "MEDIO"

    pdi_response = client.post(f"/api/collaborators/{collaborator_id}/start-pdi", headers=headers)
    assert pdi_response.status_code == 200
    assert pdi_response.json()["pdi_status"] == "EM_ANDAMENTO"

    delete_response = client.delete(f"/api/collaborators/{collaborator_id}", headers=headers)
    assert delete_response.status_code == 204

    final_list_response = client.get("/api/collaborators", headers=headers)
    assert final_list_response.status_code == 200
    assert final_list_response.json() == []
