FROM python:3.12-slim
RUN useradd --create-home --uid 10001 shalom
WORKDIR /app
COPY --chown=10001:10001 . /app
ENV PYTHONUNBUFFERED=1 SHALOM_DATA_DIR=/var/data/shalom
EXPOSE 3000
ENTRYPOINT ["python3", "deploy_entrypoint.py"]
