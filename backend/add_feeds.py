import requests
import time

API_KEY = 'mandle_internal_key_2024'
BASE = 'http://127.0.0.1:8000/api/v1'

feeds = [
    {'name': 'Marketing Brew', 'feed_type': 'rss', 'url': 'https://marketingbrewed.com/feed/', 'is_active': True, 'fetch_interval_minutes': 60},
    {'name': 'Nobel Ideas', 'feed_type': 'rss', 'url': 'https://nobleideas.co/feed/', 'is_active': True, 'fetch_interval_minutes': 60},
    {'name': 'GaryVee', 'feed_type': 'rss', 'url': 'https://feed.garyvaynerchuk.com/rss', 'is_active': True, 'fetch_interval_minutes': 60},
]

for f in feeds:
    r = requests.post(f'{BASE}/feeds', json=f, headers={'X-API-Key': API_KEY})
    print(f'Status {f["name"]}: {r.status_code}')
    if r.status_code not in (200, 201):
        print(f'  Error: {r.text}')
