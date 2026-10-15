# HelpDesk Pro — AWS Infrastructure as Code (Terraform)

This module provisions an enterprise-grade AWS VPC network and Amazon EKS managed Kubernetes cluster in region `ap-south-1` (Mumbai).

## Architecture

- **AWS VPC**: CIDR `10.20.0.0/16`
- **Subnets**:
  - 2 Public Subnets (across `ap-south-1a`, `ap-south-1b`) for external Load Balancers
  - 2 Private Subnets for secure EKS worker nodes and workloads
- **Networking**: Single NAT Gateway + Internet Gateway + Route Tables
- **Amazon EKS**: Version 1.31 managed control plane
- **Worker Node Group**: `t3.medium` instances (min 2, max 4, desired 2) with auto-scaling

---

## Prerequisites

1. Install AWS CLI: `brew install awscli`
2. Install Terraform: `brew install terraform`
3. Configure AWS credentials:
   ```bash
   aws configure
   ```
   *(Ensure your IAM user has AdministratorAccess or necessary VPC/EKS/IAM permissions).*

---

## Step-by-Step Execution Guide

### 1. Format & Lint
```bash
terraform fmt
```

### 2. Initialize Providers & Modules
```bash
terraform init
```

### 3. Validate Configuration
```bash
terraform validate
```

### 4. Review Dry-Run Plan
```bash
terraform plan -out=tfplan
```
> [!NOTE]
> Capture a screenshot of the `terraform plan` output showing the planned resources for Module M7 grading evidence.

### 5. Apply (Provision Cloud Infrastructure)
> [!IMPORTANT]
> This command creates real, paid AWS cloud resources. Run only when you are ready to evaluate live cloud deployment.
```bash
terraform apply tfplan
```

### 6. Connect `kubectl` to EKS Cluster
```bash
aws eks --region ap-south-1 update-kubeconfig --name helpdesk-eks
kubectl get nodes
```

### 7. Clean Teardown (Prevent Runaway Costs)
> [!CAUTION]
> Always destroy the cluster when you finish capturing screenshots and presentation evidence!
```bash
terraform destroy -auto-approve
```
Capture a screenshot of `terraform destroy` completion confirming all resources are removed.
