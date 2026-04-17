def test_users_management_flow(client, auth_headers):
    owner_headers = auth_headers()

    create_response = client.post(
        "/api/users",
        json={
            "full_name": "Novo Usuário",
            "email": "novo.usuario@teste.com",
            "role": "MEMBER",
            "password": "senha123",
        },
        headers=owner_headers,
    )
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    user_id = created["id"]
    assert created["email"] == "novo.usuario@teste.com"
    assert created["role"] == "MEMBER"
    assert created["is_active"] is True

    list_response = client.get("/api/users", headers=owner_headers)
    assert list_response.status_code == 200
    emails = [item["email"] for item in list_response.json()]
    assert "novo.usuario@teste.com" in emails

    role_response = client.patch(
        f"/api/users/{user_id}/role",
        json={"role": "TECH_LEAD"},
        headers=owner_headers,
    )
    assert role_response.status_code == 200, role_response.text
    assert role_response.json()["role"] == "TECH_LEAD"

    deactivate_response = client.patch(f"/api/users/{user_id}/deactivate", headers=owner_headers)
    assert deactivate_response.status_code == 200
    assert deactivate_response.json()["is_active"] is False

    activate_response = client.patch(f"/api/users/{user_id}/activate", headers=owner_headers)
    assert activate_response.status_code == 200
    assert activate_response.json()["is_active"] is True

    delete_response = client.delete(f"/api/users/{user_id}", headers=owner_headers)
    assert delete_response.status_code == 204

    final_list_response = client.get("/api/users", headers=owner_headers)
    assert final_list_response.status_code == 200
    final_emails = [item["email"] for item in final_list_response.json()]
    assert "novo.usuario@teste.com" not in final_emails
