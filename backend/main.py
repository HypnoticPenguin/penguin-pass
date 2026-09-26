import os
import random
import string
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="Penguin Pass API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load all words from words.txt into memory
ALL_WORDS = ["apple", "banana", "galaxy", "penguin", "rocket", "storm", "tiger", "winter"]
words_path = os.path.join(os.path.dirname(__file__), "words.txt")
if os.path.exists(words_path):
    try:
        with open(words_path, "r", encoding="utf-8") as f:
            loaded_words = [line.strip().lower() for line in f if line.strip()]
            if loaded_words:
                ALL_WORDS = loaded_words
    except Exception as e:
        print(f"Error loading words.txt: {e}")

@app.get("/api/generate/chars")
def generate_chars(
    length: int = Query(16, ge=4, le=128),
    symbols: bool = True,
    numbers: bool = True,
    uppercase: bool = True,
    count: int = Query(5, ge=1, le=10)
):
    chars = string.ascii_lowercase
    if uppercase:
        chars += string.ascii_uppercase
    if numbers:
        chars += string.digits
    if symbols:
        chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"
        
    passwords = []
    for _ in range(count):
        password = "".join(random.choice(chars) for _ in range(length))
        passwords.append(password)
             
    return {"passwords": passwords}

@app.get("/api/generate/passphrase")
def generate_passphrase(
    word_count: int = Query(4, ge=2, le=10),
    delimiter: str = Query("-"),
    include_number: bool = False,
    random_case: bool = False,  # Added parameter
    min_word_length: int = Query(3, ge=2, le=10),
    max_word_length: int = Query(8, ge=3, le=20),
    count: int = Query(5, ge=1, le=10)
):
    # Filter words dynamically based on both min and max length criteria
    filtered_words = [w for w in ALL_WORDS if min_word_length <= len(w) <= max_word_length]
    if not filtered_words:
        filtered_words = ALL_WORDS  # Fallback if filter is too restrictive
        
    passphrases = []
    for _ in range(count):
        chosen_words = [random.choice(filtered_words) for _ in range(word_count)]
        if include_number:
            rand_idx = random.randint(0, word_count - 1)
            chosen_words[rand_idx] += str(random.randint(10, 99))
                 
        phrase = delimiter.join(chosen_words)
        
        if random_case:
            phrase = "".join(c.upper() if random.choice([True, False]) else c.lower() for c in phrase)
            
        passphrases.append(phrase)
             
    return {"passphrases": passphrases}

# Mount static frontend build files if they exist (Docker production mode)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        target = os.path.join(static_dir, full_path)
        if os.path.exists(target) and os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(static_dir, "index.html"))