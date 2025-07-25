FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

EXPOSE 5001

