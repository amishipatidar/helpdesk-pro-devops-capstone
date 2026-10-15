variable "aws_region" {
  description = "AWS region for infrastructure provisioning"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "dev"
}

variable "cluster_name" {
  description = "Name of the Amazon EKS cluster"
  type        = string
  default     = "helpdesk-eks"
}

variable "vpc_cidr" {
  description = "CIDR block for the HelpDesk Pro VPC"
  type        = string
  default     = "10.20.0.0/16"
}
