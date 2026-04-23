FROM python:3.11-alpine

WORKDIR /app

COPY web /web
COPY server.py /server.py
COPY run.sh /run.sh

RUN chmod +x /run.sh

EXPOSE 8099

CMD ["/run.sh"]
