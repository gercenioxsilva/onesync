"""
Tests for OKR slice: objectives CRUD and key results lifecycle.
"""


def _create_objective(client, headers, title="Aumentar NPS", cycle="2026_H1"):
    response = client.post(
        "/api/okrs/objectives",
        json={"title": title, "description": "Melhorar satisfacao do cliente", "cycle": cycle},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


def _add_kr(client, headers, objective_id, title="NPS acima de 70", target=70.0, current=0.0):
    response = client.post(
        f"/api/okrs/objectives/{objective_id}/key-results",
        json={
            "title": title,
            "metric_type": "NUMBER",
            "unit": "pontos",
            "initial_value": 0.0,
            "target_value": target,
            "current_value": current,
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


# ── Objective CRUD ────────────────────────────────────────────────────────────


def test_create_objective(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)

    assert obj["title"] == "Aumentar NPS"
    assert obj["cycle"] == "2026_H1"
    assert obj["progress_pct"] == 0.0
    assert obj["status"] == "SEM_KRS"
    assert obj["key_results"] == []


def test_list_objectives_empty(client, auth_headers):
    headers = auth_headers()
    response = client.get("/api/okrs/objectives", headers=headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_objectives_with_data(client, auth_headers):
    headers = auth_headers()
    _create_objective(client, headers, title="OKR A", cycle="2026_H1")
    _create_objective(client, headers, title="OKR B", cycle="2026_H2")

    response = client.get("/api/okrs/objectives", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_list_objectives_filter_by_cycle(client, auth_headers):
    headers = auth_headers()
    _create_objective(client, headers, title="OKR A", cycle="2026_H1")
    _create_objective(client, headers, title="OKR B", cycle="2026_H2")

    response = client.get("/api/okrs/objectives?cycle=2026_H1", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "OKR A"


def test_update_objective(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)

    response = client.put(
        f"/api/okrs/objectives/{obj['id']}",
        json={"title": "Aumentar NPS e CSAT", "cycle": "2026_H2"},
        headers=headers,
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Aumentar NPS e CSAT"
    assert updated["cycle"] == "2026_H2"


def test_update_objective_not_found(client, auth_headers):
    headers = auth_headers()
    response = client.put(
        "/api/okrs/objectives/nao-existe",
        json={"title": "X"},
        headers=headers,
    )
    assert response.status_code == 404


def test_delete_objective(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)

    response = client.delete(f"/api/okrs/objectives/{obj['id']}", headers=headers)
    assert response.status_code == 204

    list_response = client.get("/api/okrs/objectives", headers=headers)
    assert list_response.json() == []


def test_delete_objective_not_found(client, auth_headers):
    headers = auth_headers()
    response = client.delete("/api/okrs/objectives/nao-existe", headers=headers)
    assert response.status_code == 404


# ── Key Results ───────────────────────────────────────────────────────────────


def test_add_key_result_updates_objective_progress(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)

    updated = _add_kr(client, headers, obj["id"], title="KR 1", target=100.0, current=50.0)

    assert len(updated["key_results"]) == 1
    kr = updated["key_results"][0]
    assert kr["title"] == "KR 1"
    assert kr["progress_pct"] == 50.0
    assert kr["status"] == "EM_RISCO"
    assert updated["progress_pct"] == 50.0
    assert updated["status"] == "EM_RISCO"


def test_objective_status_no_prazo(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)
    updated = _add_kr(client, headers, obj["id"], target=100.0, current=80.0)

    assert updated["key_results"][0]["status"] == "NO_PRAZO"
    assert updated["status"] == "NO_PRAZO"


def test_objective_status_concluido(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)
    updated = _add_kr(client, headers, obj["id"], target=100.0, current=100.0)

    assert updated["key_results"][0]["status"] == "CONCLUIDO"
    assert updated["status"] == "CONCLUIDO"


def test_multiple_krs_average_progress(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)

    _add_kr(client, headers, obj["id"], title="KR 1", target=100.0, current=0.0)
    updated = _add_kr(client, headers, obj["id"], title="KR 2", target=100.0, current=100.0)

    assert len(updated["key_results"]) == 2
    assert updated["progress_pct"] == 50.0


def test_update_kr_progress(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)
    updated = _add_kr(client, headers, obj["id"], target=100.0, current=0.0)
    kr_id = updated["key_results"][0]["id"]

    response = client.patch(
        f"/api/okrs/key-results/{kr_id}/progress",
        json={"current_value": 75.0},
        headers=headers,
    )
    assert response.status_code == 200
    result = response.json()
    kr = result["key_results"][0]
    assert kr["current_value"] == 75.0
    assert kr["progress_pct"] == 75.0
    assert kr["status"] == "NO_PRAZO"


def test_update_kr_progress_not_found(client, auth_headers):
    headers = auth_headers()
    response = client.patch(
        "/api/okrs/key-results/nao-existe/progress",
        json={"current_value": 50.0},
        headers=headers,
    )
    assert response.status_code == 404


def test_delete_key_result(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)
    updated = _add_kr(client, headers, obj["id"])
    kr_id = updated["key_results"][0]["id"]

    response = client.delete(f"/api/okrs/key-results/{kr_id}", headers=headers)
    assert response.status_code == 204

    list_response = client.get("/api/okrs/objectives", headers=headers)
    assert list_response.json()[0]["key_results"] == []


def test_delete_objective_cascades_krs(client, auth_headers):
    """Deleting objective must cascade to key results (no orphan rows)."""
    headers = auth_headers()
    obj = _create_objective(client, headers)
    _add_kr(client, headers, obj["id"])

    client.delete(f"/api/okrs/objectives/{obj['id']}", headers=headers)

    list_response = client.get("/api/okrs/objectives", headers=headers)
    assert list_response.json() == []


# ── RBAC ─────────────────────────────────────────────────────────────────────


def test_member_cannot_create_objective(client, auth_headers):
    member_headers = auth_headers(email="member@teste.com")
    response = client.post(
        "/api/okrs/objectives",
        json={"title": "OKR nao permitido", "cycle": "2026_H1"},
        headers=member_headers,
    )
    assert response.status_code == 403


def test_member_can_list_objectives(client, auth_headers):
    owner_headers = auth_headers()
    _create_objective(client, owner_headers)

    member_headers = auth_headers(email="member@teste.com")
    response = client.get("/api/okrs/objectives", headers=member_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_member_can_update_kr_progress(client, auth_headers):
    owner_headers = auth_headers()
    obj = _create_objective(client, owner_headers)
    updated = _add_kr(client, owner_headers, obj["id"])
    kr_id = updated["key_results"][0]["id"]

    member_headers = auth_headers(email="member@teste.com")
    response = client.patch(
        f"/api/okrs/key-results/{kr_id}/progress",
        json={"current_value": 40.0},
        headers=member_headers,
    )
    assert response.status_code == 200


# ── Validation ────────────────────────────────────────────────────────────────


def test_kr_invalid_metric_type(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)
    response = client.post(
        f"/api/okrs/objectives/{obj['id']}/key-results",
        json={"title": "KR", "metric_type": "INVALIDO", "target_value": 100.0},
        headers=headers,
    )
    assert response.status_code == 422


def test_kr_target_equals_initial_rejected(client, auth_headers):
    headers = auth_headers()
    obj = _create_objective(client, headers)
    response = client.post(
        f"/api/okrs/objectives/{obj['id']}/key-results",
        json={"title": "KR", "initial_value": 50.0, "target_value": 50.0},
        headers=headers,
    )
    assert response.status_code == 422


def test_add_kr_to_nonexistent_objective(client, auth_headers):
    headers = auth_headers()
    response = client.post(
        "/api/okrs/objectives/nao-existe/key-results",
        json={"title": "KR", "target_value": 100.0},
        headers=headers,
    )
    assert response.status_code == 404


# ── Domain entity unit tests ──────────────────────────────────────────────────


def test_kr_entity_progress_pct():
    from app.slices.okrs.domain.entities import KeyResult

    kr = KeyResult("id", "title", "PERCENT", "%", 0.0, 100.0, 75.0)
    assert kr.progress_pct() == 75.0
    assert kr.status() == "NO_PRAZO"


def test_kr_entity_zero_span_at_target():
    from app.slices.okrs.domain.entities import KeyResult

    kr = KeyResult("id", "title", "NUMBER", "", 50.0, 50.0, 50.0)
    assert kr.progress_pct() == 100.0


def test_kr_entity_clamped_below_zero():
    from app.slices.okrs.domain.entities import KeyResult

    kr = KeyResult("id", "title", "NUMBER", "", 10.0, 100.0, 5.0)
    assert kr.progress_pct() == 0.0
    assert kr.status() == "ATRASADO"


def test_objective_entity_no_krs():
    from app.slices.okrs.domain.entities import Objective

    obj = Objective("id", "title", "", "2026_H1", None, [])
    assert obj.progress_pct() == 0.0
    assert obj.status() == "SEM_KRS"
