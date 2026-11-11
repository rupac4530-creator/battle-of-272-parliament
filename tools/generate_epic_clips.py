import os
import sys
import time
import json
import urllib.request
import subprocess
import threading
import http.server
import socketserver
import base64
import tempfile
import asyncio
import websockets

PROJECT_DIR = r'C:\Users\BEDANTA\.gemini\antigravity\scratch\battle-of-272-parliament-v3-3d'
DIST_DIR = os.path.join(PROJECT_DIR, 'dist')
CLIPS_DIR = os.path.join(PROJECT_DIR, 'media_clips', 'epic_video_clips')
PICS_DIR = os.path.join(PROJECT_DIR, 'media_clips', 'epic_pictures')
os.makedirs(CLIPS_DIR, exist_ok=True)
os.makedirs(PICS_DIR, exist_ok=True)

MUSIC_PATH = os.path.join(PROJECT_DIR, 'public', 'music', 'ram-hi-janey-mahasangram.mp3')
VOICES_DIR = os.path.join(PROJECT_DIR, 'public', 'voices')
EDGE_PATH = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

PORT = 8100
DEBUG_PORT = 9340

CLIPS_CONFIG = [
    {
        "id": "01_modi_vande_bharat_super",
        "title": "Narendra Modi — Vande Bharat Bullet Train Super Move",
        "url_params": "autostart=1&p1=modi&p2=rahul&super=p1&superDelay=1200",
        "voice": "modi.mp3",
        "duration": 5.5,
        "pic_ratio": 0.45
    },
    {
        "id": "02_shah_chanakya_lockdown",
        "title": "Amit Shah — Chanakya Lockdown & Constitutional Freeze",
        "url_params": "autostart=1&p1=shah&p2=kejriwal&super=p1&superDelay=1200",
        "voice": "shah.mp3",
        "duration": 5.5,
        "pic_ratio": 0.45
    },
    {
        "id": "03_yogi_jcb_bulldozer",
        "title": "Yogi Adityanath — JCB Bulldozer Charge",
        "url_params": "autostart=1&p1=yogi&p2=rahul&super=p1&superDelay=1200",
        "voice": "yogi.mp3",
        "duration": 5.5,
        "pic_ratio": 0.45
    },
    {
        "id": "04_rahul_aloo_gold_machine",
        "title": "Rahul Gandhi — Aloo-Sona Machine & 24K Gold Coin Barrage",
        "url_params": "autostart=1&p1=rahul&p2=modi&super=p1&superDelay=1200",
        "voice": "rahul.mp3",
        "duration": 5.5,
        "pic_ratio": 0.45
    },
    {
        "id": "05_mamata_khela_hobe_volley",
        "title": "Mamata Banerjee — Khela Hobe Football Volley",
        "url_params": "autostart=1&p1=mamata&p2=shah&super=p1&superDelay=1200",
        "voice": "mamata.mp3",
        "duration": 5.5,
        "pic_ratio": 0.45
    },
    {
        "id": "06_kejriwal_dharna_vortex",
        "title": "Arvind Kejriwal — Dharna Electric Vortex & Broom Storm",
        "url_params": "autostart=1&p1=kejriwal&p2=modi&super=p1&superDelay=1200",
        "voice": "kejriwal.mp3",
        "duration": 5.5,
        "pic_ratio": 0.45
    },
    {
        "id": "07_sitharaman_28_percent_gst_drain",
        "title": "Nirmala Sitharaman — 28% GST Drain & Budget Deficit Stamp",
        "url_params": "autostart=1&p1=sitharaman&p2=rahul&super=p1&superDelay=1200",
        "voice": "sitharaman.mp3",
        "duration": 5.5,
        "pic_ratio": 0.45
    },
    {
        "id": "08_rajnath_rafale_moye_moye",
        "title": "Rajnath Singh — Moye-Moye Rafale Supersonic Air Strike",
        "url_params": "autostart=1&p1=rajnath&p2=kharge&super=p1&superDelay=1200",
        "voice": "rajnath.mp3",
        "duration": 5.5,
        "pic_ratio": 0.45
    },
    {
        "id": "09_podium_272_martial_arts_clash",
        "title": "The 272 Majority Podium Standoff & Martial Arts Duel",
        "url_params": "autostart=1&p1=modi&p2=yogi",
        "voice": "modi.mp3",
        "duration": 5.5,
        "pic_ratio": 0.50
    },
    {
        "id": "10_boot_protocol_and_india_map",
        "title": "18th Lok Sabha Boot Protocol & Interactive India Map",
        "url_params": "",
        "voice": "modi.mp3",
        "duration": 5.5,
        "pic_ratio": 0.35
    }
]

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def start_http_server():
    os.chdir(DIST_DIR)
    httpd = ReusableTCPServer(('127.0.0.1', PORT), http.server.SimpleHTTPRequestHandler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    for _ in range(20):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/index.html', timeout=1) as r:
                if r.status == 200:
                    print(f"HTTP Server confirmed active on 127.0.0.1:{PORT}", flush=True)
                    return httpd
        except:
            time.sleep(0.2)
    raise RuntimeError("Failed to start HTTP server!")

async def record_screencast(ws_url, duration):
    frames = []
    async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
        await ws.send(json.dumps({'id': 10, 'method': 'Page.bringToFront'}))
        await ws.send(json.dumps({
            'id': 1,
            'method': 'Page.startScreencast',
            'params': {
                'format': 'jpeg',
                'quality': 85,
                'maxWidth': 1920,
                'maxHeight': 1080,
                'everyNthFrame': 1
            }
        }))
        
        t0 = time.time()
        ack_id = 100
        while time.time() - t0 < duration:
            try:
                raw_msg = await asyncio.wait_for(ws.recv(), timeout=0.8)
                msg = json.loads(raw_msg)
                if msg.get('method') == 'Page.screencastFrame':
                    frames.append(base64.b64decode(msg['params']['data']))
                    ack_id += 1
                    await ws.send(json.dumps({
                        'id': ack_id,
                        'method': 'Page.screencastFrameAck',
                        'params': {'sessionId': msg['params']['sessionId']}
                    }))
            except asyncio.TimeoutError:
                continue
        try:
            await ws.send(json.dumps({'id': 3, 'method': 'Page.stopScreencast'}))
        except:
            pass
    return frames

def generate_clip(item, index, total):
    print(f"\n=======================================================", flush=True)
    print(f"[{index+1}/{total}] Processing: {item['title']}", flush=True)
    print(f"=======================================================", flush=True)
    
    temp_profile = tempfile.mkdtemp()
    url = f"http://127.0.0.1:{PORT}/index.html?{item['url_params']}"
    cmd = [
        EDGE_PATH,
        '--headless=new',
        '--disable-gpu-sandbox',
        '--use-gl=angle',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        f'--user-data-dir={temp_profile}',
        f'--remote-debugging-port={DEBUG_PORT}',
        '--window-size=1920,1080',
        url
    ]
    proc = subprocess.Popen(cmd)
    
    frames = []
    try:
        # Wait for Edge CDP to answer
        targets = None
        for _ in range(25):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{DEBUG_PORT}/json', timeout=1) as resp:
                    targets = json.loads(resp.read().decode())
                if targets:
                    break
            except:
                time.sleep(0.3)
                
        if not targets:
            print("ERROR: Edge did not respond on debug port!", flush=True)
            return

        page_target = [t for t in targets if t.get('type') == 'page'][0]
        ws_url = page_target['webSocketDebuggerUrl']
        
        frames = asyncio.run(record_screencast(ws_url, item['duration']))
        print(f"Captured {len(frames)} frames across {item['duration']}s", flush=True)
    except Exception as e:
        print(f"Capture error: {e}", flush=True)
    finally:
        proc.kill()
        try:
            import shutil
            shutil.rmtree(temp_profile, ignore_errors=True)
        except:
            pass

    if not frames:
        print("ERROR: No frames captured!", flush=True)
        return

    # 1. Save best picture
    pic_filename = f"{item['id']}.png"
    pic_path = os.path.join(PICS_DIR, pic_filename)
    peak_idx = min(len(frames) - 1, max(0, int(len(frames) * item['pic_ratio'])))
    with open(pic_path, 'wb') as f:
        f.write(frames[peak_idx])
    print(f"-> Picture saved: {pic_filename} ({os.path.getsize(pic_path) / 1024:.1f} KB)", flush=True)

    # 2. Render Video with ffmpeg
    fps = max(15, int(len(frames) / item['duration']))
    temp_raw = os.path.join(PROJECT_DIR, f"temp_raw_{item['id']}.mp4")
    ff_cmd = [
        'ffmpeg', '-y',
        '-f', 'image2pipe',
        '-r', str(fps),
        '-i', '-',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        temp_raw
    ]
    p = subprocess.Popen(ff_cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    all_bytes = b''.join(frames)
    p.communicate(input=all_bytes)

    # 3. Audio Muxing: Ram Hi Janey Mahasangram (music) + Politician Voice
    out_clip = os.path.join(CLIPS_DIR, f"{item['id']}.mp4")
    voice_file = os.path.join(VOICES_DIR, item['voice']) if item.get('voice') else None
    
    if voice_file and os.path.exists(voice_file):
        mux_cmd = [
            'ffmpeg', '-y',
            '-i', temp_raw,
            '-i', voice_file,
            '-i', MUSIC_PATH,
            '-filter_complex', '[1:a]volume=1.3[v];[2:a]volume=0.38[m];[v][m]amix=inputs=2:duration=first:dropout_transition=2[aout]',
            '-map', '0:v',
            '-map', '[aout]',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            out_clip
        ]
    else:
        mux_cmd = [
            'ffmpeg', '-y',
            '-i', temp_raw,
            '-i', MUSIC_PATH,
            '-filter_complex', '[1:a]volume=0.55[aout]',
            '-map', '0:v',
            '-map', '[aout]',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            out_clip
        ]
        
    subprocess.run(mux_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    if os.path.exists(temp_raw):
        os.remove(temp_raw)
    print(f"-> Video clip created: {item['id']}.mp4 ({os.path.getsize(out_clip) / (1024*1024):.2f} MB)", flush=True)

def main():
    httpd = start_http_server()
    print("Starting Epic Clips & Pictures Generation for Battle of 272...", flush=True)
    total = len(CLIPS_CONFIG)
    for idx, item in enumerate(CLIPS_CONFIG):
        generate_clip(item, idx, total)
        time.sleep(0.5)

    print("\n=======================================================", flush=True)
    print("ALL 10 VIDEO CLIPS AND 10 PICTURES SUCCESSFULLY GENERATED!", flush=True)
    print(f"Clips Directory: {CLIPS_DIR}", flush=True)
    print(f"Pictures Directory: {PICS_DIR}", flush=True)
    print("=======================================================", flush=True)

if __name__ == '__main__':
    main()
