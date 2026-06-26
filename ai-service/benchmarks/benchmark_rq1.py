import os
import time
import json
import base64
import requests
from io import BytesIO
from PIL import Image, ImageDraw
from dotenv import load_dotenv

# Load configurations
load_dotenv()
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
LLAMA_VISION_MODEL = os.getenv("LLAMA_VISION_MODEL", "meta/llama-3.2-11b-vision-instruct")
NEMOTRON_MODEL = os.getenv("NEMOTRON_MODEL", "meta/llama-3.3-70b-instruct")
NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

def create_mock_receipt():
    # Create a simple receipt image with text
    img = Image.new("RGB", (300, 400), color="#FFFFFF")
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), "NUTRISAFE INVENTORY", fill="#000000")
    draw.text((10, 40), "----------------------", fill="#000000")
    draw.text((10, 60), "1. Soto Ayam - 50 pcs", fill="#000000")
    draw.text((10, 85), "2. Sayur Lodeh - 30 pcs", fill="#000000")
    draw.text((10, 110), "3. Kerupuk Kaleng - 50 pcs", fill="#000000")
    draw.text((10, 135), "4. Es Dawet - 30 pcs", fill="#000000")
    draw.text((10, 160), "----------------------", fill="#000000")
    
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def test_llama_vision(img_b64, runs=10):
    print(f"\n--- Benchmarking {LLAMA_VISION_MODEL} (OCR/Vision) ---")
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
    }
    
    system_prompt = (
        "You are an OCR parser. Extract all items and quantities. "
        "Return ONLY JSON: {\"items\": [{\"name\": \"string\", \"qty\": \"string\"}]}"
    )
    
    payload = {
        "model": LLAMA_VISION_MODEL,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": system_prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}},
        ]}],
        "max_tokens": 512,
        "temperature": 0.1,
    }
    
    latencies = []
    success_count = 0
    token_usage = []
    
    for i in range(runs):
        start = time.time()
        try:
            resp = requests.post(NVIDIA_API_URL, headers=headers, json=payload, timeout=90)
            elapsed = (time.time() - start) * 1000
            if resp.status_code == 200:
                data = resp.json()
                usage = data.get("usage", {})
                token_usage.append(usage)
                latencies.append(elapsed)
                success_count += 1
                print(f"  Run {i+1}/{runs}: Success in {elapsed:.1f} ms | tokens: {usage.get('total_tokens', 'N/A')}")
            else:
                print(f"  Run {i+1}/{runs}: Failed with HTTP {resp.status_code}")
        except Exception as e:
            print(f"  Run {i+1}/{runs}: Error {e}")
            
    return latencies, token_usage, success_count

def test_nemotron(runs=25):
    print(f"\n--- Benchmarking {NEMOTRON_MODEL} (Text Classification) ---")
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
    }
    
    menu_items = [
        "Soto Ayam", "Rendang Sapi", "Ayam Goreng Kering", "Sup Sayur Kuah",
        "Sayur Santan Rebung", "Ikan Goreng", "Sayur Sop Bakso", "Tahu Tempe Goreng",
        "Opor Ayam Santan", "Gulai Kambing", "Tumis Kangkung", "Nasi Goreng"
    ]
    
    latencies = []
    success_count = 0
    token_usage = []
    
    for i in range(runs):
        menu_name = menu_items[i % len(menu_items)]
        prompt = (
            f'Classify: "{menu_name}". Choices: Kering, Basah, Santan. '
            f'Return ONLY JSON: {{"category":"...","epsilon_score":0.5}}'
        )
        payload = {
            "model": NEMOTRON_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 128,
            "temperature": 0.1,
        }
        
        start = time.time()
        try:
            resp = requests.post(NVIDIA_API_URL, headers=headers, json=payload, timeout=45)
            elapsed = (time.time() - start) * 1000
            if resp.status_code == 200:
                data = resp.json()
                usage = data.get("usage", {})
                token_usage.append(usage)
                latencies.append(elapsed)
                success_count += 1
                print(f"  Run {i+1}/{runs} ({menu_name}): Success in {elapsed:.1f} ms")
            else:
                print(f"  Run {i+1}/{runs}: Failed with HTTP {resp.status_code}")
        except Exception as e:
            print(f"  Run {i+1}/{runs}: Error {e}")
            
    return latencies, token_usage, success_count

def main():
    if not NVIDIA_API_KEY:
        print("Error: NVIDIA_API_KEY is not configured in .env")
        return
        
    img_b64 = create_mock_receipt()
    
    # Run vision benchmark (3 runs)
    vision_lats, vision_tokens, vision_ok = test_llama_vision(img_b64, runs=3)
    
    # Run text classification benchmark (5 runs)
    text_lats, text_tokens, text_ok = test_nemotron(runs=5)
    
    # Compile statistics
    summary = {
        "metadata": {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "llama_vision_model": LLAMA_VISION_MODEL,
            "nemotron_model": NEMOTRON_MODEL
        },
        "llama_vision": {
            "total_runs": 3,
            "success_runs": vision_ok,
            "latencies_ms": vision_lats,
            "avg_latency_ms": sum(vision_lats) / len(vision_lats) if vision_lats else 0,
            "min_latency_ms": min(vision_lats) if vision_lats else 0,
            "max_latency_ms": max(vision_lats) if vision_lats else 0,
            "token_usages": vision_tokens
        },
        "nemotron_70b": {
            "total_runs": 5,
            "success_runs": text_ok,
            "latencies_ms": text_lats,
            "avg_latency_ms": sum(text_lats) / len(text_lats) if text_lats else 0,
            "min_latency_ms": min(text_lats) if text_lats else 0,
            "max_latency_ms": max(text_lats) if text_lats else 0,
            "token_usages": text_tokens
        }
    }
    
    # Save dataset to json
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rq1_llm_latency_benchmark.json")
    with open(output_path, "w") as f:
        json.dump(summary, f, indent=2)
        
    print(f"\n============================================================")
    print(f" RQ1 BENCHMARK COMPLETE -> Saved to {output_path}")
    print(f"============================================================")
    print(f" Llama 3.2 Vision Average Latency : {summary['llama_vision']['avg_latency_ms']:.1f} ms")
    print(f" Nemotron 70B Average Latency     : {summary['nemotron_70b']['avg_latency_ms']:.1f} ms")
    print(f"============================================================")

if __name__ == "__main__":
    main()
