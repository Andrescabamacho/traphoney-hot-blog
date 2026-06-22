# Servidor de descarga: Node + ffmpeg + yt-dlp
FROM node:20-slim

# Dependencias del sistema: ffmpeg (conversión a mp3) y python3 (yt-dlp)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 ca-certificates curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev || true
COPY server.js ./

ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
