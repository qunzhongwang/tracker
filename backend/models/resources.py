from __future__ import annotations

from pydantic import BaseModel


class NodeInfo(BaseModel):
    name: str
    state: str
    cpus_total: int = 0
    cpus_alloc: int = 0
    memory_total: int = 0
    memory_alloc: int = 0
    gpus_total: int = 0
    gpus_alloc: int = 0
    partitions: list[str] = []
    features: list[str] = []


class PartitionInfo(BaseModel):
    name: str
    state: str
    total_nodes: int = 0
    available_nodes: int = 0
    total_cpus: int = 0
    allocated_cpus: int = 0


class ClusterSummary(BaseModel):
    total_nodes: int = 0
    available_nodes: int = 0
    total_cpus: int = 0
    allocated_cpus: int = 0
    total_gpus: int = 0
    allocated_gpus: int = 0
    nodes: list[NodeInfo] = []
    partitions: list[PartitionInfo] = []


class ResourceSnapshot(BaseModel):
    id: int | None = None
    timestamp: str = ""
    total_nodes: int = 0
    available_nodes: int = 0
    total_cpus: int = 0
    allocated_cpus: int = 0
    total_gpus: int = 0
    allocated_gpus: int = 0
