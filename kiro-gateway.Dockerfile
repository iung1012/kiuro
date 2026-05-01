FROM python:3.11-slim

RUN apt-get update && apt-get install -y git curl --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN git clone https://github.com/jwadow/kiro-gateway.git .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8080

CMD ["python", "main.py"]
