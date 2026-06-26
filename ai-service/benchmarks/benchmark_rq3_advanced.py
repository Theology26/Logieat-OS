import os
import time
import json
import asyncio
import random
import aiohttp
import numpy as np
import psutil

GO_HEALTH_URL = "http://localhost:8080/health"
GO_SCHOOLS_URL = "http://localhost:8080/api/schools"
GO_INVENTORY_URL = "http://localhost:8080/api/inventory"
API_KEY = "nutri_key_001_restaurant"

# Global HTTP headers
HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

def get_go_process():
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            name = proc.info['name'].lower()
            if 'main' in name or 'golang' in name:
                # check if process has connections on 8080
                connections = proc.connections()
                for conn in connections:
                    if conn.laddr.port == 8080:
                        return proc
        except Exception:
            continue
    # Fallback search
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            name = proc.info['name'].lower()
            if name in ['main.exe', 'golang-api.exe', 'main']:
                return proc
        except Exception:
            continue
    return None

async def get_goroutine_count():
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(GO_HEALTH_URL, timeout=5) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("goroutines", 0)
    except Exception as e:
        print(f"Error fetching goroutine count: {e}")
    return 0

# Endpoint load mix: 50% read, 50% write
def get_request_params(idx):
    is_read = (idx % 2 == 0)
    if is_read:
        return 'GET', GO_SCHOOLS_URL, None
    else:
        payload = {
            "urgency_min": random.randint(30, 240),
            "items": [
                {
                    "name": f"Bahan Makanan - {idx}",
                    "quantity": f"{random.randint(1, 10)} kg",
                    "risk_level": random.choice(["Low", "Medium", "High"])
                }
            ]
        }
        return 'POST', GO_INVENTORY_URL, payload

async def worker(worker_id, session, run_state, results):
    """
    Worker runs continuously sending requests.
    It stops when run_state['stop'] is set.
    """
    idx = worker_id
    while not run_state['stop']:
        method, url, payload = get_request_params(idx)
        idx += run_state['concurrency'] # unique indexes
        start = time.time()
        try:
            if method == 'GET':
                async with session.get(url, headers=HEADERS, timeout=10) as resp:
                    status = resp.status
                    text = await resp.text()
            else:
                async with session.post(url, headers=HEADERS, json=payload, timeout=10) as resp:
                    status = resp.status
                    text = await resp.text()
            
            latency = (time.time() - start) * 1000
            success = (status == 200)
            error_code = None if success else f"HTTP_{status}"
            results.append((latency, success, error_code))
        except asyncio.TimeoutError:
            latency = (time.time() - start) * 1000
            results.append((latency, False, "Timeout"))
        except Exception as e:
            latency = (time.time() - start) * 1000
            results.append((latency, False, "ConnectionError"))
        
        # Micro-yield
        await asyncio.sleep(0.001)

async def run_tier(concurrency, go_proc):
    print(f"\n--- Running Concurrency Tier: {concurrency} users (Target: >=30s and >=1000 reqs) ---")
    
    # Pre-test metrics
    goroutines_before = await get_goroutine_count()
    mem_before = go_proc.memory_info().rss / (1024 * 1024) if go_proc else 0
    
    results = []
    run_state = {
        'stop': False,
        'concurrency': concurrency
    }
    
    connector = aiohttp.TCPConnector(limit=500, ttl_dns_cache=300)
    async with aiohttp.ClientSession(connector=connector) as session:
        # Start workers
        workers = []
        for i in range(concurrency):
            workers.append(asyncio.create_task(worker(i, session, run_state, results)))
            
        # Run loop monitor
        start_time = time.time()
        while True:
            await asyncio.sleep(0.5)
            elapsed = time.time() - start_time
            completed_reqs = len(results)
            
            # Condition: At least 30 seconds have passed AND at least 1000 requests are completed
            if elapsed >= 30.0 and completed_reqs >= 1000:
                break
                
        # Signal stop
        run_state['stop'] = True
        # Wait for workers to finish current request
        await asyncio.gather(*workers)
        
    duration = time.time() - start_time
    total_requests = len(results)
    
    # Post-test metrics
    await asyncio.sleep(1.0) # GC wait
    goroutines_after = await get_goroutine_count()
    mem_after = go_proc.memory_info().rss / (1024 * 1024) if go_proc else 0
    cpu_usage = go_proc.cpu_percent() if go_proc else 0
    
    latencies = [r[0] for r in results if r[1]]
    failures = [r[2] for r in results if not r[1]]
    
    success_rate = (len(latencies) / total_requests) * 100 if total_requests else 0
    rps = total_requests / duration
    
    avg_lat = np.mean(latencies) if latencies else 0
    p50 = np.percentile(latencies, 50) if latencies else 0
    p95 = np.percentile(latencies, 95) if latencies else 0
    p99 = np.percentile(latencies, 99) if latencies else 0
    max_lat = max(latencies) if latencies else 0
    
    # Error classification
    err_counts = {}
    for f in failures:
        err_counts[f] = err_counts.get(f, 0) + 1
        
    print(f"  Duration       : {duration:.2f} s")
    print(f"  Total Requests : {total_requests}")
    print(f"  RPS            : {rps:.2f} req/s")
    print(f"  Success Rate   : {success_rate:.2f}%")
    if err_counts:
        print(f"  Errors         : {err_counts}")
    print(f"  Latency        : Avg={avg_lat:.1f}ms | p50={p50:.1f}ms | p95={p95:.1f}ms | p99={p99:.1f}ms")
    print(f"  Go process CPU : {cpu_usage:.1f}%")
    print(f"  Go process RAM : {mem_before:.1f} MB -> {mem_after:.1f} MB (Delta: {mem_after-mem_before:+.1f} MB)")
    print(f"  Goroutines     : {goroutines_before} -> {goroutines_after} (Delta: {goroutines_after-goroutines_before:+.0f})")
    
    return {
        "concurrency": concurrency,
        "total_requests": total_requests,
        "duration_sec": duration,
        "rps": rps,
        "success_rate": success_rate,
        "errors": err_counts,
        "avg_latency_ms": avg_lat,
        "p50_latency_ms": p50,
        "p95_latency_ms": p95,
        "p99_latency_ms": p99,
        "max_latency_ms": max_lat,
        "cpu_percent": cpu_usage,
        "mem_before_mb": mem_before,
        "mem_after_mb": mem_after,
        "mem_delta_mb": mem_after - mem_before,
        "goroutines_before": goroutines_before,
        "goroutines_after": goroutines_after,
        "goroutines_delta": goroutines_after - goroutines_before
    }

async def run_sustained_test(concurrency, duration_seconds, go_proc):
    print(f"\n--- Running Sustained Load Test: Concurrency={concurrency} for {duration_seconds}s (5 minutes) ---")
    
    mem_start = go_proc.memory_info().rss / (1024 * 1024) if go_proc else 0
    goroutines_start = await get_goroutine_count()
    
    results = []
    run_state = {
        'stop': False,
        'concurrency': concurrency
    }
    
    # Track metrics in intervals
    interval_stats = []
    start_time = time.time()
    end_time = start_time + duration_seconds
    
    connector = aiohttp.TCPConnector(limit=500, ttl_dns_cache=300)
    async with aiohttp.ClientSession(connector=connector) as session:
        workers = []
        for i in range(concurrency):
            workers.append(asyncio.create_task(worker(i, session, run_state, results)))
            
        # Monitoring loop
        last_count = 0
        while time.time() < end_time:
            await asyncio.sleep(30.0) # Check every 30 seconds
            elapsed = time.time() - start_time
            curr_mem = go_proc.memory_info().rss / (1024 * 1024) if go_proc else 0
            curr_cpu = go_proc.cpu_percent() if go_proc else 0
            curr_goroutines = await get_goroutine_count()
            
            # calculate metrics for this interval
            total_now = len(results)
            completed_in_interval = total_now - last_count
            last_count = total_now
            interval_rps = completed_in_interval / 30.0
            
            interval_lats = [r[0] for r in results[-completed_in_interval:] if r[1]]
            interval_avg = np.mean(interval_lats) if interval_lats else 0
            
            print(f"  [Time={elapsed:.0f}s] Interval RPS: {interval_rps:.1f} | Avg Latency: {interval_avg:.1f}ms | RAM: {curr_mem:.1f} MB | CPU: {curr_cpu:.1f}% | Goroutines: {curr_goroutines}")
            interval_stats.append({
                "elapsed_sec": elapsed,
                "rps": interval_rps,
                "avg_latency_ms": interval_avg,
                "memory_mb": curr_mem,
                "cpu_percent": curr_cpu,
                "goroutines": curr_goroutines
            })
            
        run_state['stop'] = True
        await asyncio.gather(*workers)
        
    total_duration = time.time() - start_time
    total_reqs = len(results)
    
    await asyncio.sleep(1.0)
    mem_end = go_proc.memory_info().rss / (1024 * 1024) if go_proc else 0
    goroutines_end = await get_goroutine_count()
    
    latencies = [r[0] for r in results if r[1]]
    failures = [r[2] for r in results if not r[1]]
    success_rate = (len(latencies) / total_reqs * 100) if total_reqs else 0
    rps = total_reqs / total_duration
    
    avg_lat = np.mean(latencies) if latencies else 0
    p50 = np.percentile(latencies, 50) if latencies else 0
    p95 = np.percentile(latencies, 95) if latencies else 0
    p99 = np.percentile(latencies, 99) if latencies else 0
    
    err_counts = {}
    for f in failures:
        err_counts[f] = err_counts.get(f, 0) + 1
        
    print(f"\nSustained Load Test Summary (5 Minutes):")
    print(f"  Duration       : {total_duration:.1f} s")
    print(f"  Total Requests : {total_reqs}")
    print(f"  RPS            : {rps:.2f} req/s")
    print(f"  Success Rate   : {success_rate:.2f}%")
    print(f"  Avg Latency    : {avg_lat:.1f} ms")
    print(f"  Memory Delta   : {mem_start:.1f} MB -> {mem_end:.1f} MB (Delta: {mem_end-mem_start:+.1f} MB)")
    print(f"  Goroutine Delta: {goroutines_start} -> {goroutines_end} (Delta: {goroutines_end-goroutines_start:+.0f})")
    
    return {
        "concurrency": concurrency,
        "duration_sec": total_duration,
        "total_requests": total_reqs,
        "rps": rps,
        "success_rate": success_rate,
        "errors": err_counts,
        "avg_latency_ms": avg_lat,
        "p50_latency_ms": p50,
        "p95_latency_ms": p95,
        "p99_latency_ms": p99,
        "mem_start_mb": mem_start,
        "mem_end_mb": mem_end,
        "mem_delta_mb": mem_end - mem_start,
        "goroutines_start": goroutines_start,
        "goroutines_end": goroutines_end,
        "goroutines_delta": goroutines_end - goroutines_start,
        "intervals": interval_stats
    }

async def main():
    # Verify endpoint connectivity and auth
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(GO_SCHOOLS_URL, headers=HEADERS, timeout=5) as r:
                print(f"Initial Schools Endpoint Check - Status: {r.status}")
                if r.status != 200:
                    print("Error: Schools endpoint returned non-200. Please ensure Go gateway is configured properly.")
                    return
    except Exception as e:
        print(f"Error connecting to Golang API Gateway: {e}")
        return
        
    go_proc = get_go_process()
    if go_proc:
        print(f"Successfully hooked Go API process [PID={go_proc.pid}]")
    else:
        print("Warning: Could not identify Go API process. OS resource tracking will be disabled.")
        
    # IEEE standard concurrency tiers
    concurrencies = [10, 25, 50, 75, 100, 150, 200]
    tier_results = []
    
    for c in concurrencies:
        await asyncio.sleep(2) # Cool down
        res = await run_tier(c, go_proc)
        tier_results.append(res)
        
    # Sustained 5-minute stress test at 50 concurrency
    await asyncio.sleep(5)
    sustained_res = await run_sustained_test(50, 300, go_proc)
    
    summary = {
        "metadata": {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "endpoints": [GO_SCHOOLS_URL, GO_INVENTORY_URL],
            "concurrency_tiers": concurrencies
        },
        "concurrency_tiers": tier_results,
        "sustained_test": sustained_res
    }
    
    output_path = "rq3_advanced_scalability_benchmark.json"
    with open(output_path, "w") as f:
        json.dump(summary, f, indent=2)
        
    print(f"\n============================================================")
    print(f" ADVANCED RQ3 BENCHMARK COMPLETE -> Saved to {output_path}")
    print(f"============================================================")

if __name__ == "__main__":
    asyncio.run(main())
