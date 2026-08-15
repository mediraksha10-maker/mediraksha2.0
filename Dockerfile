FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

RUN npm install

COPY . .

RUN npm run build

ENV JWT_SECRET=
ENV DB_URL=postgres
ENV GROQ_API_KEY=abc
ENV FRONTEND_URL=http://localhost:5173
ENV GEOAPIFY_API_KEY=

EXPOSE 8000

CMD ["npm", "start"]
