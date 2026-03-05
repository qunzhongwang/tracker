from __future__ import annotations

import json
import logging
import re

from backend.models.resources import NodeInfo, PartitionInfo, ClusterSummary
from backend.services.slurm import get_cluster_info

logger = logging.getLogger(__name__)


def _parse_gres_gpus(gres_val) -> int:
    if not gres_val:
        return 0
    if isinstance(gres_val, (list, tuple)):
        return sum(_parse_gres_gpus(g) for g in gres_val)
    if not isinstance(gres_val, str):
        return 0
    match = re.search(r"gpu[^:]*:(\d+)", gres_val)
    return int(match.group(1)) if match else 0


def _parse_node(raw: dict) -> NodeInfo:
    gpus_total = _parse_gres_gpus(raw.get("gres", ""))
    gpus_used = _parse_gres_gpus(raw.get("gres_used", ""))

    return NodeInfo(
        name=raw.get("name", raw.get("hostname", "")),
        state=raw.get("state", ["unknown"])[0] if isinstance(raw.get("state"), list) else str(raw.get("state", "unknown")),
        cpus_total=raw.get("cpus", 0),
        cpus_alloc=raw.get("alloc_cpus", 0),
        memory_total=raw.get("real_memory", 0),
        memory_alloc=raw.get("alloc_memory", 0),
        gpus_total=gpus_total,
        gpus_alloc=gpus_used,
        partitions=raw.get("partitions", []),
        features=raw.get("active_features", []) if isinstance(raw.get("active_features"), list) else [],
    )


async def get_cluster_summary() -> ClusterSummary:
    data = await get_cluster_info()

    # Slurm 25.x uses "sinfo" key for partition-level data, "nodes" for node-level
    sinfo_entries = data.get("sinfo", [])
    nodes_raw = data.get("nodes", [])

    # Parse individual nodes if available
    nodes = [_parse_node(n) for n in nodes_raw]

    # Build node list from sinfo entries if no node-level data
    if not nodes and sinfo_entries:
        node_map: dict[str, NodeInfo] = {}
        for entry in sinfo_entries:
            node_state = entry.get("node", {}).get("state", ["unknown"])
            state_str = node_state[0] if isinstance(node_state, list) else str(node_state)
            nodes_data = entry.get("nodes", {})
            node_names = nodes_data.get("nodes", []) if isinstance(nodes_data, dict) else []
            cpus = entry.get("cpus", {})
            partition = entry.get("partition", {})
            part_name = partition.get("name", "") if isinstance(partition, dict) else ""
            gpus_total_entry = _parse_gres_gpus(entry.get("gres", ""))
            per_node_cpus = cpus.get("maximum", 0) if isinstance(cpus, dict) else 0

            for name in node_names:
                if name not in node_map:
                    node_map[name] = NodeInfo(
                        name=name,
                        state=state_str,
                        cpus_total=per_node_cpus,
                        partitions=[part_name] if part_name else [],
                    )
                else:
                    if part_name and part_name not in node_map[name].partitions:
                        node_map[name].partitions.append(part_name)
        nodes = list(node_map.values())

    # Aggregate from partition data
    partitions: list[PartitionInfo] = []
    total_cpus = 0
    allocated_cpus = 0
    total_gpus = 0
    allocated_gpus = 0
    total_nodes_set: set[str] = set()
    avail_nodes_set: set[str] = set()

    if sinfo_entries:
        part_agg: dict[str, dict] = {}
        for entry in sinfo_entries:
            partition = entry.get("partition", {})
            part_name = partition.get("name", "") if isinstance(partition, dict) else ""
            if not part_name:
                continue

            cpus = entry.get("cpus", {}) if isinstance(entry.get("cpus"), dict) else {}
            nodes_info = entry.get("nodes", {}) if isinstance(entry.get("nodes"), dict) else {}
            node_names = nodes_info.get("nodes", [])
            node_state = entry.get("node", {}).get("state", ["unknown"])
            state_str = (node_state[0] if isinstance(node_state, list) else str(node_state)).upper()

            total_nodes_set.update(node_names)
            if "IDLE" in state_str or "MIX" in state_str:
                avail_nodes_set.update(node_names)

            if part_name not in part_agg:
                part_agg[part_name] = {"total_nodes": 0, "available_nodes": 0, "total_cpus": 0, "allocated_cpus": 0}

            part_agg[part_name]["total_nodes"] += nodes_info.get("total", 0)
            part_agg[part_name]["available_nodes"] += nodes_info.get("idle", 0)
            part_agg[part_name]["total_cpus"] += cpus.get("total", 0)
            part_agg[part_name]["allocated_cpus"] += cpus.get("allocated", 0)

        for name, agg in part_agg.items():
            partitions.append(PartitionInfo(
                name=name,
                state="up",
                total_nodes=agg["total_nodes"],
                available_nodes=agg["available_nodes"],
                total_cpus=agg["total_cpus"],
                allocated_cpus=agg["allocated_cpus"],
            ))
            total_cpus += agg["total_cpus"]
            allocated_cpus += agg["allocated_cpus"]

    # Fallback to node-level aggregation
    if not sinfo_entries and nodes:
        total_cpus = sum(n.cpus_total for n in nodes)
        allocated_cpus = sum(n.cpus_alloc for n in nodes)
        total_gpus = sum(n.gpus_total for n in nodes)
        allocated_gpus = sum(n.gpus_alloc for n in nodes)

    return ClusterSummary(
        total_nodes=len(total_nodes_set) or len(nodes),
        available_nodes=len(avail_nodes_set) or sum(1 for n in nodes if "idle" in n.state.lower() or "mix" in n.state.lower()),
        total_cpus=total_cpus,
        allocated_cpus=allocated_cpus,
        total_gpus=total_gpus,
        allocated_gpus=allocated_gpus,
        nodes=nodes,
        partitions=partitions,
    )


def snapshot_dict(summary: ClusterSummary) -> dict:
    return {
        "total_nodes": summary.total_nodes,
        "available_nodes": summary.available_nodes,
        "total_cpus": summary.total_cpus,
        "allocated_cpus": summary.allocated_cpus,
        "total_gpus": summary.total_gpus,
        "allocated_gpus": summary.allocated_gpus,
    }
