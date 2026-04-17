def _create_collaborator(client, headers):
    response = client.post(
        "/api/collaborators",
        json={
            "name": "Maria Souza",
            "email": "maria@empresa.com",
            "squad": "Core",
            "tech_lead_id": None,
            "role": "Backend Engineer",
            "focus": "Melhorar APIs",
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_one_on_one_crud_flow(client, auth_headers):
    headers = auth_headers()
    collaborator = _create_collaborator(client, headers)

    create_payload = {
        "collaborator_id": collaborator["id"],
        "meeting_date": "2026-04-17",
        "mood_score": 8,
        "summary": "Alinhamento do ciclo",
        "next_steps": "Fechar plano técnico",
        "next_meeting_date": "2026-04-24",
    }
    create_response = client.post("/api/one-on-ones", json=create_payload, headers=headers)
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    one_on_one_id = created["id"]
    assert created["summary"] == "Alinhamento do ciclo"
    assert created["risk_signal"] == "POSITIVO"

    list_response = client.get(
        f"/api/one-on-ones/collaborator/{collaborator['id']}",
        headers=headers,
    )
    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed) == 1
    assert listed[0]["id"] == one_on_one_id

    update_payload = {
        **create_payload,
        "mood_score": 5,
        "summary": "Revisão de dificuldades",
        "next_steps": "Parear com tech lead",
    }
    update_response = client.put(
        f"/api/one-on-ones/{one_on_one_id}",
        json=update_payload,
        headers=headers,
    )
    assert update_response.status_code == 200, update_response.text
    updated = update_response.json()
    assert updated["mood_score"] == 5
    assert updated["summary"] == "Revisão de dificuldades"
    assert updated["next_steps"] == "Parear com tech lead"
    assert updated["risk_signal"] == "ESTAVEL"

    delete_response = client.delete(f"/api/one-on-ones/{one_on_one_id}", headers=headers)
    assert delete_response.status_code == 204

    final_list_response = client.get(
        f"/api/one-on-ones/collaborator/{collaborator['id']}",
        headers=headers,
    )
    assert final_list_response.status_code == 200
    assert final_list_response.json() == []
