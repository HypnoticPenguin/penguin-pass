import os
import secrets
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

# Load and sanitize all words from custom word list or fallback to words.txt[cite: 1]
ALL_WORDS = ["apple", "banana", "galaxy", "penguin", "rocket", "storm", "tiger", "winter"]
words_path = os.environ.get("CUSTOM_WORD_LIST", os.path.join(os.path.dirname(__file__), "words.txt"))
if os.path.exists(words_path):
    try:
        with open(words_path, "r", encoding="utf-8") as f:
            loaded_words = []
            for line in f:
                cleaned = line.strip().lower()
                if cleaned and cleaned.isalpha():
                    loaded_words.append(cleaned)
            if loaded_words:
                ALL_WORDS = loaded_words
    except Exception as e:
        print(f"Error loading word list from {words_path}: {e}")

@app.get("/api/generate/chars")
def generate_chars(
    length: int = Query(16, ge=4, le=128),
    symbols: bool = True,
    numbers: bool = True,
    uppercase: bool = True,
    include_ambiguous: bool = True,
    count: int = Query(5, ge=1, le=10)
):
    chars = string.ascii_lowercase
    if uppercase:
        chars += string.ascii_uppercase
    if numbers:
        chars += string.digits
    if symbols:
        chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"
        
    if not include_ambiguous:
        ambiguous = "iIlL1oO0"
        chars = "".join(c for c in chars if c not in ambiguous)
        if not chars:
            chars = string.ascii_lowercase  # Fallback safety

    passwords = []
    for _ in range(count):
        password = "".join(secrets.choice(chars) for _ in range(length))
        passwords.append(password)
        
    return {"passwords": passwords}

@app.get("/api/generate/pronounceable")
def generate_pronounceable(
    length: int = Query(8, ge=4, le=20),
    case_style: str = Query("title"),  # 'lower', 'title', 'upper', 'random'
    include_number: bool = True,
    count: int = Query(5, ge=1, le=10)
):
    consonants = "bcdfghjklmnpqrstvwxyz"
    vowels = "aeiou"
    
    passwords = []
    for _ in range(count):
        pwd_chars = []
        for i in range(length):
            if i % 2 == 0:
                pwd_chars.append(secrets.choice(consonants))
            else:
                pwd_chars.append(secrets.choice(vowels))
        
        # Insert 2 random digits anywhere into the character list if enabled
        if include_number:
            num_str = str(secrets.randbelow(90) + 10) # 2 digits (10-99)
            for digit in num_str:
                insert_idx = secrets.randbelow(len(pwd_chars) + 1)
                pwd_chars.insert(insert_idx, digit)

        pwd = "".join(pwd_chars)
        
        if case_style == "title":
            # Capitalize first alphabetical letter if title case is selected
            chars_list = list(pwd)
            for idx, c in enumerate(chars_list):
                if c.isalpha():
                    chars_list[idx] = c.upper()
                    break
            pwd = "".join(chars_list)
        elif case_style == "upper":
            pwd = pwd.upper()
        elif case_style == "random":
            pwd = "".join(c.upper() if c.isalpha() and secrets.choice([True, False]) else c.lower() if c.isalpha() else c for c in pwd)
        else:
            pwd = pwd.lower()
            
        passwords.append(pwd)
        
    return {"passwords": passwords}

@app.get("/api/generate/passphrase")
def generate_passphrase(
    word_count: int = Query(4, ge=2, le=10),
    delimiter: str = Query("-"),
    include_number: bool = False,
    random_case: bool = False,
    min_word_length: int = Query(3, ge=2, le=10),
    max_word_length: int = Query(8, ge=3, le=20),
    count: int = Query(5, ge=1, le=10)
):
    filtered_words = [w for w in ALL_WORDS if min_word_length <= len(w) <= max_word_length]
    if not filtered_words:
        filtered_words = ALL_WORDS

    passphrases = []
    for _ in range(count):
        chosen_words = [secrets.choice(filtered_words) for _ in range(word_count)]
        if include_number:
            rand_idx = secrets.randbelow(word_count)
            chosen_words[rand_idx] += str(secrets.randbelow(90) + 10)
            
        phrase = delimiter.join(chosen_words)
        
        if random_case:
            phrase = "".join(c.upper() if secrets.choice([True, False]) else c.lower() for c in phrase)
            
        passphrases.append(phrase)
        
    return {"passphrases": passphrases}

@app.get("/api/generate/pin")
def generate_pin(
    length: int = Query(4, ge=4, le=12),
    count: int = Query(5, ge=1, le=10)
):
    pins = []
    for _ in range(count):
        pin = "".join(secrets.choice(string.digits) for _ in range(length))
        pins.append(pin)
    return {"pins": pins}

# Mount static frontend build files if they exist (Docker production mode)[cite: 1]
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        target = os.path.join(static_dir, full_path)
        if os.path.exists(target) and os.path.isfile(target):
            return FileResponse(target)
            
        # Serve index.html with no-cache headers so browsers always fetch the latest version
        response = FileResponse(os.path.join(static_dir, "index.html"))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response