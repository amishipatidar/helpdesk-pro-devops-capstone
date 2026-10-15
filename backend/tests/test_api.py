def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP"}


def test_ready(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "READY"


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "HelpDesk Pro API"
    assert response.json()["docs"] == "/docs"


def test_metrics_endpoint(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text or "python_info" in response.text


def test_create_ticket_success(client):
    payload = {
        "title": "VPN connection drops after 10 minutes",
        "description": "User experiences recurring disconnects on remote network.",
        "requester": "alex.taylor@company.com",
        "category": "NETWORK",
        "priority": "HIGH",
        "status": "OPEN",
    }
    response = client.post("/api/tickets", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["title"] == payload["title"]
    assert data["category"] == "NETWORK"
    assert data["priority"] == "HIGH"
    assert data["status"] == "OPEN"
    assert "created_at" in data
    assert "updated_at" in data


def test_create_ticket_validation_error(client):
    # Empty title should fail Pydantic min_length=1 validation
    response = client.post(
        "/api/tickets",
        json={"title": "", "category": "NETWORK", "priority": "HIGH"},
    )
    assert response.status_code == 422

    # Invalid priority literal
    response_invalid = client.post(
        "/api/tickets",
        json={"title": "Fix printer", "priority": "SUPER_URGENT"},
    )
    assert response_invalid.status_code == 422


def test_get_ticket_by_id(client):
    create_res = client.post(
        "/api/tickets",
        json={
            "title": "Request GitHub organization invite",
            "description": "Need repo access for Q4 deliverables.",
            "requester": "sarah.connor@company.com",
            "category": "ACCESS",
            "priority": "MEDIUM",
        },
    )
    assert create_res.status_code == 201
    ticket_id = create_res.json()["id"]

    get_res = client.get(f"/api/tickets/{ticket_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == ticket_id
    assert get_res.json()["requester"] == "sarah.connor@company.com"


def test_get_ticket_not_found(client):
    response = client.get("/api/tickets/999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_update_ticket(client):
    create_res = client.post(
        "/api/tickets",
        json={
            "title": "Database connection pool exhaustion",
            "description": "Investigate connection leaks under load.",
            "requester": "devops.lead@company.com",
            "category": "TECHNICAL",
            "priority": "CRITICAL",
            "status": "OPEN",
        },
    )
    ticket_id = create_res.json()["id"]

    update_res = client.put(
        f"/api/tickets/{ticket_id}",
        json={"status": "IN_PROGRESS", "priority": "CRITICAL"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "IN_PROGRESS"
    assert update_res.json()["priority"] == "CRITICAL"


def test_delete_ticket(client):
    create_res = client.post(
        "/api/tickets",
        json={
            "title": "Duplicate ticket to remove",
            "requester": "tester@company.com",
        },
    )
    ticket_id = create_res.json()["id"]

    del_res = client.delete(f"/api/tickets/{ticket_id}")
    assert del_res.status_code == 204

    # Verification: should now return 404
    verify_res = client.get(f"/api/tickets/{ticket_id}")
    assert verify_res.status_code == 404


def test_delete_ticket_not_found(client):
    response = client.delete("/api/tickets/888888")
    assert response.status_code == 404


def test_list_tickets_with_filters_and_search(client):
    client.post(
        "/api/tickets",
        json={"title": "Keyboard replacement needed", "requester": "Alice", "category": "HARDWARE", "status": "OPEN"},
    )
    client.post(
        "/api/tickets",
        json={"title": "Figma license renewal", "requester": "Bob", "category": "SOFTWARE", "status": "IN_PROGRESS"},
    )
    client.post(
        "/api/tickets",
        json={"title": "Wi-Fi outage in 3rd floor lounge", "requester": "Charlie", "category": "NETWORK", "status": "OPEN"},
    )

    # Filter by category
    cat_res = client.get("/api/tickets?category=HARDWARE")
    assert cat_res.status_code == 200
    assert len(cat_res.json()) >= 1
    assert all(t["category"] == "HARDWARE" for t in cat_res.json())

    # Search by keyword
    search_res = client.get("/api/tickets?search=lounge")
    assert search_res.status_code == 200
    assert len(search_res.json()) == 1
    assert "Wi-Fi outage" in search_res.json()[0]["title"]


def test_tickets_stats(client):
    client.post(
        "/api/tickets",
        json={"title": "Bug in billing invoice PDF", "priority": "CRITICAL", "status": "OPEN"},
    )
    client.post(
        "/api/tickets",
        json={"title": "Onboard new hire laptop", "priority": "MEDIUM", "status": "IN_PROGRESS"},
    )
    client.post(
        "/api/tickets",
        json={"title": "Password reset for finance", "priority": "LOW", "status": "RESOLVED"},
    )

    stats_res = client.get("/api/tickets/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total"] >= 3
    assert stats["open"] >= 1
    assert stats["inProgress"] >= 1
    assert stats["resolved"] >= 1
    assert stats["critical"] >= 1
