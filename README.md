# Penguin Pass



A modern web application for generating secure character passwords and word passphrases.

## Features



* **Character Passwords**: Generate custom-length passwords (6 to 64 characters) with options to include symbols, numbers, and uppercase letters.


* **Word Passphrases**: Create secure passphrases featuring adjustable word counts, max word lengths, custom delimiters, and optional random numbers.


* **Theme Support**: Toggle seamlessly between Light Mode and Dark Mode, with automatic fallback to your system preferences.



---

## Tech Stack



* **Frontend**: React 18, Vite


* **Backend**: Python, FastAPI, Uvicorn


* **Deployment**: Docker & Docker Compose (with Traefik reverse proxy and Homepage integration support)


---

## Running with Docker

### Development / Local Deployment



To run a standalone container locally mapping port `8080` to the internal port `8000`:

```yaml
services:
  penguin-pass:
    image: mmozzano/penguin-pass:latest
    ports:
      - "8080:8000"
    restart: unless-stopped

```

### Production (with Traefik and Homepage)



To run the production container with Traefik routing and Homepage labels enabled:

```yaml
services:
  penguin-pass:
    image: mmozzano/penguin-pass:latest
    restart: unless-stopped
    container_name: ${SERVICE}
    networks:
      - traefik_default
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${SERVICE}.entrypoints=web, websecure"
      - "traefik.http.routers.${SERVICE}.rule=Host(`${SERVICE}.${DOMAIN}`)"
      - "traef.http.routers.${SERVICE}.tls=true"
      - "traefik.http.routers.${SERVICE}.tls.certresolver=cloudflare"
      - "traefik.http.routers.${SERVICE}.service=${SERVICE}"
      - "traefik.http.services.${SERVICE}.loadbalancer.server.port=8000"
      - "traefik.docker.network=traefik_default"
      - "traefik.http.routers.${SERVICE}.middlewares=secured@file"
      - homepage.group=${GROUP}
      - homepage.name=${SERVICE_NAME}
      - homepage.icon=password.png
      - homepage.href=https://${SERVICE}.${DOMAIN}/
      - homepage.description=${DESCRIPTION}

networks:
  traefik_default:
    external: true

```

---

## Configuration (`.env`) (required only if running the production container with Traefik and Homepage)



Configure your environment variables using the following template:

```env
DOMAIN=yourdomain.com
SERVICE=pass
SERVICE_NAME=Penguin Pass
GROUP=Applications
DESCRIPTION=Password Generator

```
