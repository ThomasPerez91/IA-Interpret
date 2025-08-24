# -------- Stage 1 : Build --------
FROM node:22-alpine AS builder
WORKDIR /app

# Installer pnpm globalement
RUN npm install -g pnpm

# Copier uniquement ce qui est nécessaire pour installer les deps
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances avec cache lockfile
RUN pnpm install --frozen-lockfile

# Variables d'environnement pour Vite (intégrées au build)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Copier le reste du projet et lancer le build
COPY . .
RUN pnpm run build

# -------- Stage 2 : Production --------
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Copier le build depuis le stage builder
COPY --from=builder /app/dist ./

# Supprimer la config par défaut et ajouter la tienne si besoin
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port Nginx
EXPOSE 80

# Nginx se lance automatiquement avec l'image officielle
