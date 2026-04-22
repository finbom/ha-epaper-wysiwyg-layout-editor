FROM python:3.11-alpine

WORKDIR /app

COPY web /web
COPY run.sh /run.sh

RUN chmod +x /run.sh

EXPOSE 8080

CMD ["/run.sh"]
