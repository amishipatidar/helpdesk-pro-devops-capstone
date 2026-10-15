# HelpDesk Pro — Monitoring & Observability Guide (M9)

This module sets up Prometheus metrics collection and Grafana visualization for HelpDesk Pro.

---

## 1. Verify Application Metrics Endpoint

The FastAPI backend exposes native Prometheus metrics via `prometheus-fastapi-instrumentator` at `/metrics`:
```bash
curl http://localhost:8000/metrics | grep http_requests
```
*(Screenshot required for M9 grading).*

---

## 2. Deploy Prometheus & Grafana to Kubernetes

Use the official `kube-prometheus-stack` Helm chart:

```bash
# Add repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install monitoring stack
helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f monitoring/prometheus-values.yaml
```

---

## 3. Verify Prometheus Scraping (Target UP)

Forward port to Prometheus UI:
```bash
kubectl port-forward svc/prometheus-stack-kube-prom-prometheus 9090:9090 -n monitoring
```
1. Open in browser: `http://localhost:9090/targets`
2. Search for `helpdesk-backend-monitor`
3. Verify state shows **UP (1/1)**
*(Capture screenshot for M9 grading evidence).*

---

## 4. Access Grafana & Import Dashboard

Forward port to Grafana:
```bash
kubectl port-forward svc/prometheus-stack-grafana 3000:80 -n monitoring
```
1. Open in browser: `http://localhost:3000`
   - Default User: `admin`
   - Default Password: `prom-operator` (or check via `kubectl get secret -n monitoring prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d`)
2. Go to **Dashboards $\rightarrow$ New $\rightarrow$ Import**
3. Upload `monitoring/grafana-dashboard.json`
4. Select the Prometheus data source and click **Import**

---

## 5. Generate Traffic to Populate Panels

In a terminal, trigger the load generator script:
```bash
bash scripts/load-test.sh
```
Watch the Grafana dashboard populate with live HTTP request rate, p95 latency curve, status code distributions, and CPU utilization.
*(Capture screenshot for M9 grading evidence).*
