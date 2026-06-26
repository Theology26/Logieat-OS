"""
============================================================================
MBG Smart Logistics — A2C Benchmark Testing Script v2 (Paper-Ready)
============================================================================
Dataset: mbg_routing_benchmark_dataset.json (same as uploaded to Mendeley Data)
Algorithms compared:
  1. A2C (PPO-style, v4 model)
  2. Weighted Heuristic (urgency × proximity)
  3. Nearest Neighbor (baseline)

Metrics for paper:
  - Avg Distance (km)                   : lower = better
  - Avg Time (min)                      : lower = better
  - Schools Visited (count + %)         : higher = better
  - Capacity Utilization (%)            : higher = better
  - Spoilage Prevention Rate (%)        : NEW — % schools served before spoilage
  - Urgency Completion Rate (%)         : NEW — % high-urgency (≤30min) schools served
  - Inference Time (ms)                 : informational
  - A2C Win Rate vs Heuristic           : primary headline metric

Usage:
    python benchmark_a2c.py                                 # Full benchmark
    python benchmark_a2c.py --weights a2c_best.pth --runs 30
    python benchmark_a2c.py --difficulties easy normal hard
============================================================================
"""

import argparse
import json
import math
import os
import time
from datetime import datetime
from typing import Dict, Any, List

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

DATASET_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mbg_routing_benchmark_dataset.json")

def load_raw_scenarios(path=DATASET_PATH):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["scenarios"]

def to_internal_scenario(sc):
    return {
        "difficulty": sc["difficulty"],
        "depot_lat": sc["depot_latitude"],
        "depot_lng": sc["depot_longitude"],
        "vehicle_capacity": sc["vehicle_capacity"],
        "max_time_minutes": sc["max_time_minutes"],
        "schools": [
            {
                "id": s["school_id"],
                "name": s["name"],
                "lat": s["latitude"],
                "lng": s["longitude"],
                "demand": s["demand_packages"],
                "urgency": s["urgency_minutes"],
            }
            for s in sc["schools"]
        ],
    }

def load_dataset(path=DATASET_PATH):
    return [to_internal_scenario(sc) for sc in load_raw_scenarios(path)]

def split_train_val(scenarios, val_ratio=0.1, seed=42):
    scenarios = list(scenarios)
    rng = np.random.RandomState(seed)
    rng.shuffle(scenarios)
    n_val = max(1, int(len(scenarios) * val_ratio))
    return scenarios[n_val:], scenarios[:n_val]

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("benchmark-v2")

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MAX_SCHOOLS = 50
SCHOOL_FEATURES = 5
GLOBAL_FEATURES = 4
STATE_DIM = GLOBAL_FEATURES + MAX_SCHOOLS * SCHOOL_FEATURES
SPEED_KMH = 30.0

# Threshold untuk "high urgency" schools (untuk Urgency Completion Rate)
HIGH_URGENCY_THRESHOLD_MINUTES = 30.0


# ============================================================================
# Haversine
# ============================================================================

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def haversine_minutes(lat1, lon1, lat2, lon2, speed=SPEED_KMH):
    return (haversine_km(lat1, lon1, lat2, lon2) / speed) * 60.0


# ============================================================================
# Actor Networks — harus match dengan train_a2c.py
# Coba load v4 (skip-connection), fallback ke v3 (simple)
# ============================================================================

class ActorNetworkV4(nn.Module):
    """v4: skip-connection architecture"""
    def __init__(self, state_dim, max_schools):
        super().__init__()
        self.fc1 = nn.Linear(state_dim, 512)
        self.ln1 = nn.LayerNorm(512)
        self.fc2 = nn.Linear(512, 256)
        self.ln2 = nn.LayerNorm(256)
        self.fc3 = nn.Linear(256 + 512, 256)
        self.ln3 = nn.LayerNorm(256)
        self.fc4 = nn.Linear(256, max_schools)

    def forward(self, x):
        h1 = F.relu(self.ln1(self.fc1(x)))
        h2 = F.relu(self.ln2(self.fc2(h1)))
        h3 = F.relu(self.ln3(self.fc3(torch.cat([h2, h1], dim=-1))))
        return self.fc4(h3)


class ActorNetworkV3(nn.Module):
    """v3: simple 3-layer"""
    def __init__(self, state_dim, max_schools):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, 256), nn.LayerNorm(256), nn.ReLU(),
            nn.Linear(256, 128), nn.ReLU(),
            nn.Linear(128, max_schools),
        )

    def forward(self, x):
        return self.net(x)


def load_actor(weights_path):
    """Load actor — auto-detect v3 vs v4 dari checkpoint metadata."""
    checkpoint = torch.load(weights_path, map_location=DEVICE, weights_only=False)
    state_dim = checkpoint.get("state_dim", STATE_DIM)
    max_schools = checkpoint.get("max_schools", MAX_SCHOOLS)
    model_version = checkpoint.get("model_version", "v3")

    if "v4" in model_version:
        actor = ActorNetworkV4(state_dim, max_schools).to(DEVICE)
        logger.info(f"Using ActorNetworkV4 (skip-connection, {state_dim}→512→256→skip→256→{max_schools})")
    else:
        actor = ActorNetworkV3(state_dim, max_schools).to(DEVICE)
        logger.info(f"Using ActorNetworkV3 (simple, {state_dim}→256→128→{max_schools})")

    actor.load_state_dict(checkpoint["actor"])
    actor.eval()
    return actor, checkpoint


# ============================================================================
# State Encoding
# ============================================================================

def encode_state(curr_lat, curr_lng, capacity_ratio, elapsed_ratio,
                 schools, visited, max_demand, max_urgency):
    state = [curr_lat / 90.0, curr_lng / 180.0, capacity_ratio, elapsed_ratio]
    for i in range(MAX_SCHOOLS):
        if i < len(schools):
            s = schools[i]
            state.extend([
                s["lat"] / 90.0, s["lng"] / 180.0,
                s["demand"] / max(max_demand, 1),
                s["urgency"] / max(max_urgency, 1),
                1.0 if i in visited else 0.0,
            ])
        else:
            state.extend([0.0, 0.0, 0.0, 0.0, 0.0])
    return torch.tensor(state, dtype=torch.float32, device=DEVICE)


# ============================================================================
# Routing Algorithms
# ============================================================================

def run_a2c(actor, scenario):
    schools = scenario["schools"]
    depot_lat, depot_lng = scenario["depot_lat"], scenario["depot_lng"]
    vehicle_capacity = scenario["vehicle_capacity"]
    max_time = scenario["max_time_minutes"]
    n_schools = len(schools)
    max_demand = max(s["demand"] for s in schools)
    max_urgency = max(s["urgency"] for s in schools)

    curr_lat, curr_lng = depot_lat, depot_lng
    remaining_capacity = vehicle_capacity
    elapsed_time = 0.0
    visited = set()
    route = []
    total_distance_km = 0.0
    spoiled_count = 0
    high_urgency_served = 0
    high_urgency_total = sum(1 for s in schools if s["urgency"] <= HIGH_URGENCY_THRESHOLD_MINUTES)

    start_time = time.time()

    while len(visited) < n_schools:
        state = encode_state(
            curr_lat, curr_lng,
            remaining_capacity / vehicle_capacity,
            elapsed_time / max_time,
            schools, visited, max_demand, max_urgency,
        )
        with torch.no_grad():
            logits = actor(state)

        mask = torch.full((MAX_SCHOOLS,), float("-inf"), device=DEVICE)
        for i, s in enumerate(schools):
            if i not in visited and s["demand"] <= remaining_capacity:
                t = haversine_minutes(curr_lat, curr_lng, s["lat"], s["lng"])
                if elapsed_time + t <= max_time:
                    mask[i] = 0.0

        masked_logits = logits + mask
        if torch.all(torch.isinf(masked_logits)):
            break

        action = torch.argmax(masked_logits).item()
        school = schools[action]
        travel_t = haversine_minutes(curr_lat, curr_lng, school["lat"], school["lng"])
        dist_km = haversine_km(curr_lat, curr_lng, school["lat"], school["lng"])

        elapsed_time += travel_t
        total_distance_km += dist_km
        remaining_capacity -= school["demand"]
        visited.add(action)
        curr_lat, curr_lng = school["lat"], school["lng"]

        sisa = school["urgency"] - elapsed_time
        if sisa < 0:
            spoiled_count += 1
        if school["urgency"] <= HIGH_URGENCY_THRESHOLD_MINUTES and sisa >= 0:
            high_urgency_served += 1

        route.append({
            "sequence": len(route) + 1,
            "school_id": school["id"],
            "school_name": school["name"],
            "distance_km": round(dist_km, 3),
            "elapsed_minutes": round(elapsed_time, 1),
            "minutes_before_spoilage": round(sisa, 1),
            "spoiled": sisa < 0,
        })

    inference_ms = (time.time() - start_time) * 1000
    n_visited = len(visited)
    spoilage_prevention_rate = (n_visited - spoiled_count) / max(n_visited, 1) * 100
    urgency_completion_rate = (high_urgency_served / high_urgency_total * 100) if high_urgency_total > 0 else 100.0

    return {
        "method": "a2c",
        "total_schools_visited": n_visited,
        "total_schools": n_schools,
        "total_distance_km": round(total_distance_km, 3),
        "total_time_minutes": round(elapsed_time, 1),
        "capacity_used": vehicle_capacity - remaining_capacity,
        "capacity_utilization_pct": round((vehicle_capacity - remaining_capacity) / vehicle_capacity * 100, 1),
        "inference_time_ms": round(inference_ms, 2),
        "all_visited": n_visited == n_schools,
        "spoiled_count": spoiled_count,
        "spoilage_prevention_rate": round(spoilage_prevention_rate, 1),
        "high_urgency_total": high_urgency_total,
        "high_urgency_served": high_urgency_served,
        "urgency_completion_rate": round(urgency_completion_rate, 1),
    }


def run_heuristic(scenario):
    """Weighted Heuristic: score = urgency_weight / distance"""
    schools = scenario["schools"]
    depot_lat, depot_lng = scenario["depot_lat"], scenario["depot_lng"]
    vehicle_capacity = scenario["vehicle_capacity"]
    max_time = scenario["max_time_minutes"]
    n_schools = len(schools)
    high_urgency_total = sum(1 for s in schools if s["urgency"] <= HIGH_URGENCY_THRESHOLD_MINUTES)

    curr_lat, curr_lng = depot_lat, depot_lng
    remaining_capacity = vehicle_capacity
    elapsed_time = 0.0
    unvisited = list(range(n_schools))
    visited = set()
    total_distance_km = 0.0
    spoiled_count = 0
    high_urgency_served = 0

    start_time = time.time()

    while unvisited:
        best_idx, best_score = None, float("-inf")
        for i in unvisited:
            s = schools[i]
            if s["demand"] > remaining_capacity:
                continue
            t = haversine_minutes(curr_lat, curr_lng, s["lat"], s["lng"])
            if elapsed_time + t > max_time:
                continue
            dist_km = max(haversine_km(curr_lat, curr_lng, s["lat"], s["lng"]), 0.001)
            score = (1.0 / dist_km) + (100.0 / max(s["urgency"], 1))
            if score > best_score:
                best_score, best_idx = score, i

        if best_idx is None:
            break

        school = schools[best_idx]
        travel_t = haversine_minutes(curr_lat, curr_lng, school["lat"], school["lng"])
        dist_km = haversine_km(curr_lat, curr_lng, school["lat"], school["lng"])
        elapsed_time += travel_t
        total_distance_km += dist_km
        remaining_capacity -= school["demand"]
        visited.add(best_idx)
        curr_lat, curr_lng = school["lat"], school["lng"]
        unvisited.remove(best_idx)

        sisa = school["urgency"] - elapsed_time
        if sisa < 0:
            spoiled_count += 1
        if school["urgency"] <= HIGH_URGENCY_THRESHOLD_MINUTES and sisa >= 0:
            high_urgency_served += 1

    n_visited = len(visited)
    inference_ms = (time.time() - start_time) * 1000
    spoilage_prevention_rate = (n_visited - spoiled_count) / max(n_visited, 1) * 100
    urgency_completion_rate = (high_urgency_served / high_urgency_total * 100) if high_urgency_total > 0 else 100.0

    return {
        "method": "heuristic",
        "total_schools_visited": n_visited,
        "total_schools": n_schools,
        "total_distance_km": round(total_distance_km, 3),
        "total_time_minutes": round(elapsed_time, 1),
        "capacity_used": vehicle_capacity - remaining_capacity,
        "capacity_utilization_pct": round((vehicle_capacity - remaining_capacity) / vehicle_capacity * 100, 1),
        "inference_time_ms": round(inference_ms, 2),
        "all_visited": n_visited == n_schools,
        "spoiled_count": spoiled_count,
        "spoilage_prevention_rate": round(spoilage_prevention_rate, 1),
        "high_urgency_total": high_urgency_total,
        "high_urgency_served": high_urgency_served,
        "urgency_completion_rate": round(urgency_completion_rate, 1),
    }


def run_nearest_neighbor(scenario):
    """Pure Nearest Neighbor Baseline"""
    schools = scenario["schools"]
    depot_lat, depot_lng = scenario["depot_lat"], scenario["depot_lng"]
    vehicle_capacity = scenario["vehicle_capacity"]
    max_time = scenario["max_time_minutes"]
    n_schools = len(schools)
    high_urgency_total = sum(1 for s in schools if s["urgency"] <= HIGH_URGENCY_THRESHOLD_MINUTES)

    curr_lat, curr_lng = depot_lat, depot_lng
    remaining_capacity = vehicle_capacity
    elapsed_time = 0.0
    unvisited = list(range(n_schools))
    visited = set()
    total_distance_km = 0.0
    spoiled_count = 0
    high_urgency_served = 0

    start_time = time.time()

    while unvisited:
        best_idx, best_dist = None, float("inf")
        for i in unvisited:
            s = schools[i]
            if s["demand"] > remaining_capacity:
                continue
            t = haversine_minutes(curr_lat, curr_lng, s["lat"], s["lng"])
            if elapsed_time + t > max_time:
                continue
            dist = haversine_km(curr_lat, curr_lng, s["lat"], s["lng"])
            if dist < best_dist:
                best_dist, best_idx = dist, i

        if best_idx is None:
            break

        school = schools[best_idx]
        travel_t = haversine_minutes(curr_lat, curr_lng, school["lat"], school["lng"])
        dist_km = haversine_km(curr_lat, curr_lng, school["lat"], school["lng"])
        elapsed_time += travel_t
        total_distance_km += dist_km
        remaining_capacity -= school["demand"]
        visited.add(best_idx)
        curr_lat, curr_lng = school["lat"], school["lng"]
        unvisited.remove(best_idx)

        sisa = school["urgency"] - elapsed_time
        if sisa < 0:
            spoiled_count += 1
        if school["urgency"] <= HIGH_URGENCY_THRESHOLD_MINUTES and sisa >= 0:
            high_urgency_served += 1

    n_visited = len(visited)
    inference_ms = (time.time() - start_time) * 1000
    spoilage_prevention_rate = (n_visited - spoiled_count) / max(n_visited, 1) * 100
    urgency_completion_rate = (high_urgency_served / high_urgency_total * 100) if high_urgency_total > 0 else 100.0

    return {
        "method": "nearest_neighbor",
        "total_schools_visited": n_visited,
        "total_schools": n_schools,
        "total_distance_km": round(total_distance_km, 3),
        "total_time_minutes": round(elapsed_time, 1),
        "capacity_used": vehicle_capacity - remaining_capacity,
        "capacity_utilization_pct": round((vehicle_capacity - remaining_capacity) / vehicle_capacity * 100, 1),
        "inference_time_ms": round(inference_ms, 2),
        "all_visited": n_visited == n_schools,
        "spoiled_count": spoiled_count,
        "spoilage_prevention_rate": round(spoilage_prevention_rate, 1),
        "high_urgency_total": high_urgency_total,
        "high_urgency_served": high_urgency_served,
        "urgency_completion_rate": round(urgency_completion_rate, 1),
    }


# ============================================================================
# Aggregate Helpers
# ============================================================================

def aggregate_runs(runs: List[Dict]) -> Dict:
    dists = [r["total_distance_km"] for r in runs]
    times = [r["total_time_minutes"] for r in runs]
    visited_list = [r["total_schools_visited"] for r in runs]
    cap_pcts = [r["capacity_utilization_pct"] for r in runs]
    infer_ms = [r["inference_time_ms"] for r in runs]
    all_vis = [1 if r["all_visited"] else 0 for r in runs]
    spoil_prev = [r["spoilage_prevention_rate"] for r in runs]
    urgency_comp = [r["urgency_completion_rate"] for r in runs]

    return {
        "avg_distance": round(np.mean(dists), 3),
        "std_distance": round(np.std(dists), 3),
        "min_distance": round(np.min(dists), 3),
        "max_distance": round(np.max(dists), 3),
        "avg_time": round(np.mean(times), 1),
        "avg_visited": round(np.mean(visited_list), 1),
        "avg_capacity_pct": round(np.mean(cap_pcts), 1),
        "avg_inference_ms": round(np.mean(infer_ms), 2),
        "all_visited_pct": round(np.mean(all_vis) * 100, 1),
        "avg_spoilage_prevention_rate": round(np.mean(spoil_prev), 1),
        "avg_urgency_completion_rate": round(np.mean(urgency_comp), 1),
        "num_runs": len(runs),
    }


# ============================================================================
# Report Generator — Paper-Ready Format
# ============================================================================

def generate_report(results: Dict[str, Any]) -> str:
    lines = []
    sep = "=" * 82
    lines.append(sep)
    lines.append("  MBG SMART LOGISTICS — A2C BENCHMARK REPORT (Paper-Ready)")
    lines.append(sep)
    lines.append(f"  Generated    : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"  Device       : {DEVICE}")
    lines.append(f"  Dataset      : {results['metadata']['dataset_path']}")
    lines.append(f"  Total scen.  : {results['metadata']['dataset_total_scenarios']}")
    lines.append(f"  Runs/level   : {results['metadata']['runs_per_scenario']}")
    lines.append(f"  Difficulties : {', '.join(results['metadata']['difficulties'])}")
    lines.append(f"  Weights      : {results['metadata']['weights_path']}")
    if results["metadata"].get("model_info"):
        info = results["metadata"]["model_info"]
        if "best_val_reward" in info:
            lines.append(f"  Best Val Rew : {info['best_val_reward']:.2f}")
        if "training_episodes" in info:
            lines.append(f"  Train Eps    : {info['training_episodes']}")
        if "model_version" in info:
            lines.append(f"  Model Ver    : {info['model_version']}")
    lines.append(sep)

    metrics = [
        ("Avg Distance (km)",         "avg_distance",                  ".2f", "lower"),
        ("Avg Time (min)",             "avg_time",                      ".1f", "lower"),
        ("Avg Schools Visited",        "avg_visited",                   ".1f", "higher"),
        ("Capacity Util (%)",          "avg_capacity_pct",              ".1f", "higher"),
        ("All Schools Visited (%)",    "all_visited_pct",               ".1f", "higher"),
        ("Spoilage Prevention (%)",    "avg_spoilage_prevention_rate",  ".1f", "higher"),
        ("Urgency Completion (%)",     "avg_urgency_completion_rate",   ".1f", "higher"),
        ("Inference (ms)",             "avg_inference_ms",              ".2f", "lower"),
    ]

    for scenario_name, data in results["scenarios"].items():
        info = data["info"]
        lines.append("")
        lines.append(
            f"  DIFFICULTY: {scenario_name.upper()} "
            f"({info['min_schools']}–{info['max_schools']} schools, {info['num_runs']} runs)"
        )
        lines.append(f"  {'=' * 78}")

        methods = ["a2c", "heuristic", "nearest_neighbor"]
        available = [m for m in methods if m in data["aggregate"]]

        header = f"  {'Metric':<30}"
        for m in available:
            label = {"a2c": "A2C (Ours)", "heuristic": "Heuristic", "nearest_neighbor": "NearNeighbor"}[m]
            header += f"| {label:^14}"
        if "a2c" in available and "heuristic" in available:
            header += f"| {'Δ A2C/HW':^10}"
        lines.append(header)
        lines.append(f"  {'-'*30}" + "+--------------" * len(available) +
                     ("+-----------" if "a2c" in available and "heuristic" in available else ""))

        for label, key, fmt, better_dir in metrics:
            row = f"  {label:<30}"
            vals = {}
            for m in available:
                v = data["aggregate"][m].get(key, 0)
                vals[m] = v
                row += f"| {v:^14{fmt}}"

            if "a2c" in vals and "heuristic" in vals:
                a2c_v, hw_v = vals["a2c"], vals["heuristic"]
                if hw_v != 0:
                    delta_pct = ((a2c_v - hw_v) / abs(hw_v)) * 100
                    marker = "+" if (better_dir == "lower" and delta_pct < 0) or \
                                    (better_dir == "higher" and delta_pct > 0) else "-"
                    row += f"| {marker}{delta_pct:>+6.1f}%"
                else:
                    row += f"| {'N/A':^10}"
            lines.append(row)

        # Win rate section
        if "a2c" in data["aggregate"] and "heuristic" in data["aggregate"]:
            a2c_win = data["aggregate"]["a2c"].get("win_count", 0)
            hw_win = data["aggregate"]["heuristic"].get("win_count", 0)
            total = a2c_win + hw_win
            if total > 0:
                lines.append(f"  {'-'*30}" + "+--------------" * len(available) + "+-----------")
                lines.append(f"  {'Win Rate vs Heuristic':<30}| {a2c_win/total*100:^13.1f}%|")
        lines.append("")

    lines.append(sep)
    lines.append("  OVERALL SUMMARY")
    lines.append(sep)

    total_a2c_wins = total_hw_wins = 0
    a2c_dists, hw_dists = [], []
    a2c_spoil_prev, hw_spoil_prev = [], []
    a2c_urgency, hw_urgency = [], []

    for data in results["scenarios"].values():
        if "a2c" in data["aggregate"] and "heuristic" in data["aggregate"]:
            total_a2c_wins += data["aggregate"]["a2c"].get("win_count", 0)
            total_hw_wins  += data["aggregate"]["heuristic"].get("win_count", 0)
            a2c_dists.append(data["aggregate"]["a2c"]["avg_distance"])
            hw_dists.append(data["aggregate"]["heuristic"]["avg_distance"])
            a2c_spoil_prev.append(data["aggregate"]["a2c"]["avg_spoilage_prevention_rate"])
            hw_spoil_prev.append(data["aggregate"]["heuristic"]["avg_spoilage_prevention_rate"])
            a2c_urgency.append(data["aggregate"]["a2c"]["avg_urgency_completion_rate"])
            hw_urgency.append(data["aggregate"]["heuristic"]["avg_urgency_completion_rate"])

    if total_a2c_wins + total_hw_wins > 0:
        wr = total_a2c_wins / (total_a2c_wins + total_hw_wins) * 100
        lines.append(f"  Overall A2C Win Rate     : {wr:.1f}% ({total_a2c_wins}/{total_a2c_wins+total_hw_wins} runs)")

    if a2c_dists and hw_dists:
        avg_a2c = np.mean(a2c_dists)
        avg_hw = np.mean(hw_dists)
        if avg_hw != 0:
            improvement = ((avg_hw - avg_a2c) / avg_hw) * 100
            lines.append(f"  Avg Distance Saving      : {improvement:+.1f}% vs heuristic")

    if a2c_spoil_prev and hw_spoil_prev:
        diff = np.mean(a2c_spoil_prev) - np.mean(hw_spoil_prev)
        lines.append(f"  Spoilage Prevention      : A2C={np.mean(a2c_spoil_prev):.1f}%  HW={np.mean(hw_spoil_prev):.1f}%  Δ={diff:+.1f}pp")

    if a2c_urgency and hw_urgency:
        diff = np.mean(a2c_urgency) - np.mean(hw_urgency)
        lines.append(f"  Urgency Completion Rate  : A2C={np.mean(a2c_urgency):.1f}%  HW={np.mean(hw_urgency):.1f}%  Δ={diff:+.1f}pp")

    lines.append("")
    lines.append("  LEGEND:")
    lines.append("  + = A2C performs better  |  - = Heuristic performs better")
    lines.append("  Distance/Time: lower = better  |  Visited/Capacity/Spoilage/Urgency: higher = better")
    lines.append("  Spoilage Prevention Rate: % of visited schools where food was NOT spoiled")
    lines.append("  Urgency Completion Rate:  % of high-urgency schools (≤30min) served before spoilage")
    lines.append(sep)

    return "\n".join(lines)


# ============================================================================
# Main Benchmark
# ============================================================================

def run_benchmark(args):
    weights_path = args.weights
    actor = None
    model_info = {}

    if os.path.exists(weights_path):
        try:
            actor, checkpoint = load_actor(weights_path)
            for key in ["best_val_reward", "training_episodes", "model_version"]:
                if key in checkpoint:
                    model_info[key] = checkpoint[key]
            logger.info(f"  Best val reward: {checkpoint.get('best_val_reward', 'N/A')}")
            logger.info(f"  Training eps:    {checkpoint.get('training_episodes', 'N/A')}")
        except Exception as e:
            logger.error(f"Failed to load weights: {e}")
    else:
        logger.warning(f"Weights '{weights_path}' not found. Heuristic-only benchmark.")

    dataset_scenarios = load_dataset(args.dataset)
    by_difficulty: Dict[str, List] = {}
    for sc in dataset_scenarios:
        by_difficulty.setdefault(sc["difficulty"], []).append(sc)

    difficulties = args.difficulties
    runs_per_scenario = args.runs

    all_results = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "weights_path": weights_path,
            "dataset_path": args.dataset,
            "dataset_total_scenarios": len(dataset_scenarios),
            "runs_per_scenario": runs_per_scenario,
            "difficulties": difficulties,
            "model_info": model_info,
            "high_urgency_threshold_minutes": HIGH_URGENCY_THRESHOLD_MINUTES,
        },
        "scenarios": {},
    }

    for difficulty in difficulties:
        group = by_difficulty.get(difficulty, [])
        if not group:
            logger.warning(f"No scenarios with difficulty='{difficulty}', skipping.")
            continue

        scenarios_to_run = group[:runs_per_scenario]
        logger.info(f"\n{'='*62}")
        logger.info(f"Benchmarking: {difficulty.upper()} × {len(scenarios_to_run)} runs")
        logger.info(f"{'='*62}")

        a2c_runs, hw_runs, nn_runs = [], [], []

        for run_idx, scenario in enumerate(scenarios_to_run):
            if actor is not None:
                a2c_runs.append(run_a2c(actor, scenario))
            hw_runs.append(run_heuristic(scenario))
            nn_runs.append(run_nearest_neighbor(scenario))

            if (run_idx + 1) % 10 == 0:
                logger.info(f"   {run_idx+1}/{len(scenarios_to_run)} runs done...")

        scenario_data = {"raw_runs": {}, "aggregate": {}, "info": {
            "min_schools": min(len(s["schools"]) for s in scenarios_to_run),
            "max_schools": max(len(s["schools"]) for s in scenarios_to_run),
            "num_runs": len(scenarios_to_run),
        }}

        if a2c_runs:
            a2c_agg = aggregate_runs(a2c_runs)
            a2c_agg["win_count"] = sum(
                1 for a, h in zip(a2c_runs, hw_runs) if a["total_distance_km"] < h["total_distance_km"]
            )
            scenario_data["aggregate"]["a2c"] = a2c_agg
            scenario_data["raw_runs"]["a2c"] = a2c_runs
            logger.info(
                f"   A2C : dist={a2c_agg['avg_distance']:.2f}km | "
                f"visited={a2c_agg['avg_visited']:.1f} | "
                f"spoil_prev={a2c_agg['avg_spoilage_prevention_rate']:.1f}% | "
                f"urgency={a2c_agg['avg_urgency_completion_rate']:.1f}%"
            )

        hw_agg = aggregate_runs(hw_runs)
        hw_agg["win_count"] = sum(
            1 for a, h in zip(a2c_runs, hw_runs) if h["total_distance_km"] < a["total_distance_km"]
        ) if a2c_runs else 0
        scenario_data["aggregate"]["heuristic"] = hw_agg
        scenario_data["raw_runs"]["heuristic"] = hw_runs
        logger.info(
            f"   HW  : dist={hw_agg['avg_distance']:.2f}km | "
            f"visited={hw_agg['avg_visited']:.1f} | "
            f"spoil_prev={hw_agg['avg_spoilage_prevention_rate']:.1f}% | "
            f"urgency={hw_agg['avg_urgency_completion_rate']:.1f}%"
        )

        nn_agg = aggregate_runs(nn_runs)
        scenario_data["aggregate"]["nearest_neighbor"] = nn_agg
        scenario_data["raw_runs"]["nearest_neighbor"] = nn_runs

        all_results["scenarios"][difficulty] = scenario_data

    report = generate_report(all_results)

    results_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "benchmark_results.json")
    with open(results_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)
    logger.info(f"Results saved → {results_path}")

    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "benchmark_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)
    logger.info(f"Report saved  → {report_path}")

    try:
        print("\n" + report)
    except UnicodeEncodeError:
        print("\n" + report.encode("ascii", errors="replace").decode("ascii"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MBG A2C Benchmark v2")
    parser.add_argument("--weights",      type=str,   default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "a2c_best.pth"))
    parser.add_argument("--runs",         type=int,   default=30,
                        help="Scenarios per difficulty (default 30 untuk signifikansi statistik)")
    parser.add_argument("--difficulties", type=str, nargs="+", default=["easy", "normal", "hard"])
    parser.add_argument("--dataset",      type=str,   default=DATASET_PATH)
    args = parser.parse_args()
    run_benchmark(args)
