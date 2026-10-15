# HelpDesk Pro — Kubernetes Troubleshooting Labs

This directory contains two deliberate troubleshooting scenarios to simulate common production Kubernetes failures and demonstrate root-cause analysis (RCA).

---

## Lab 1: Broken Image Tag (`ImagePullBackOff`)

### Failure Description
A deployment requests an image tag that does not exist in the remote registry (`helpdesk-backend:v999.nonexistent-tag`). The kubelet cannot pull the container image, leaving the Pod stuck in `ImagePullBackOff`.

### 1. Apply the Faulty Manifest
```bash
kubectl apply -f troubleshooting/broken-image.yaml
```

### 2. Diagnose & Identify Root Cause
```bash
# Check pod status (Notice status: ErrImagePull or ImagePullBackOff)
kubectl get pods -n helpdesk -l app=broken-image-lab

# Inspect detailed event stream
kubectl describe pod -l app=broken-image-lab -n helpdesk
```

**Expected Event Diagnostic:**
```text
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  15s                default-scheduler  Successfully assigned helpdesk/helpdesk-broken-image-xxx to node-1
  Normal   Pulling    14s                kubelet            Pulling image "ghcr.io/example/helpdesk-backend:v999.nonexistent-tag"
  Warning  Failed     12s                kubelet            Failed to pull image "...": rpc error: code = NotFound
  Warning  Failed     12s                kubelet            Error: ErrImagePull
  Normal   BackOff    10s (x2 over 11s)  kubelet            Back-off pulling image "..."
  Warning  Failed     10s (x2 over 11s)  kubelet            Error: ImagePullBackOff
```

### 3. Resolution (Fixing the Deployment)
Update the container image to a valid tag:
```bash
kubectl set image deployment/helpdesk-broken-image backend=ghcr.io/YOUR_ORG/helpdesk-backend:latest -n helpdesk
```

### 4. Verify Recovery
```bash
kubectl rollout status deployment/helpdesk-broken-image -n helpdesk
kubectl get pods -n helpdesk -l app=broken-image-lab
```

### 5. Cleanup Lab Workload
```bash
kubectl delete -f troubleshooting/broken-image.yaml
```

---

## Lab 2: Broken Service Selector (Missing Endpoints)

### Failure Description
A Kubernetes `Service` is deployed with a selector label `app: label-that-does-not-exist`. Because no Pods match this selector, the Kubernetes Endpoints controller cannot associate any backend Pod IPs with the Service. Any HTTP requests sent to this Service fail with connection timeout or connection refused.

### 1. Apply the Faulty Service
```bash
kubectl apply -f troubleshooting/broken-service.yaml
```

### 2. Diagnose & Identify Root Cause
```bash
# 1. Inspect Service
kubectl get svc helpdesk-broken-service -n helpdesk

# 2. Check Endpoints (Notice ENDPOINTS column is <none>)
kubectl get endpoints helpdesk-broken-service -n helpdesk

# 3. Inspect Pod labels in the cluster
kubectl get pods -n helpdesk --show-labels

# 4. Describe Service to see the invalid selector
kubectl describe svc helpdesk-broken-service -n helpdesk | grep Selector
# Output: Selector:  app=label-that-does-not-exist
```

### 3. Resolution
Patch the Service selector to match the running backend Pods (`app=helpdesk-backend`):
```bash
kubectl patch svc helpdesk-broken-service -n helpdesk -p '{"spec":{"selector":{"app":"helpdesk-backend"}}}'
```

### 4. Verify Recovery
```bash
# Verify Endpoints now lists the live Pod IPs on port 8000
kubectl get endpoints helpdesk-broken-service -n helpdesk
```

### 5. Cleanup Lab Service
```bash
kubectl delete -f troubleshooting/broken-service.yaml
```
