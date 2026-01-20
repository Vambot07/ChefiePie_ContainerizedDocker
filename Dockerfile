# 1. Base Image
FROM node:20

# 2. Working Directory
WORKDIR /app

# 3. Copy Dependencies first (for caching)
COPY package*.json ./

# 4. Install Dependencies
RUN npm install --legacy-peer-deps

# 5. Copy Source Code
COPY . .

# 6. Expose Port 5000
EXPOSE 5000

# 7. Start Command
# We use a custom script 'web:docker' to ensure it binds to all interfaces (0.0.0.0)
CMD ["npm", "run", "web:docker"]

# GitHub Repository Link required by assignment:
# https://github.com/Vambot07/ChefiePie_ContainerizedDocker
