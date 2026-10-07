# Armazenamento de mídia (local disk / S3 / MinIO)

A mídia (uploads do admin e binários do importador) é armazenada através de uma abstração
`StorageService`, selecionável por configuração. A **forma da URL pública é sempre `/media/<key>`**,
independente do backend, então o conteúdo e o front-end não precisam saber onde os bytes vivem.

## Seleção do backend

| Propriedade | Env | Default | Descrição |
|---|---|---|---|
| `app.storage.provider` | `APP_STORAGE_PROVIDER` | `local` | `local` (disco) ou `s3` (AWS S3 / MinIO) |
| `app.storage.local-dir` | `APP_STORAGE_LOCAL_DIR` | `./storage` | Raiz do provider local |

O provider `s3` exige o bloco `aws.*`:

| Propriedade | Env | Default | Descrição |
|---|---|---|---|
| `aws.enabled` | `AWS_ENABLED` | `false` | Cria os beans `S3Client`/`S3Presigner` |
| `aws.access-key` | `AWS_ACCESS_KEY` | — | Access key id (nunca hardcode) |
| `aws.secret-key` | `AWS_SECRET_KEY` | — | Secret access key |
| `aws.region` | `AWS_REGION` | `us-east-1` | Região AWS |
| `aws.endpoint` | `AWS_ENDPOINT` | — | Endpoint custom (MinIO). Vazio → AWS real |
| `aws.path-style` | `AWS_PATH_STYLE` | `true` | Path-style addressing (MinIO) |
| `aws.bucket.name` | `AWS_BUCKET_NAME` | `ficas-media` | Bucket de mídia |

## Comportamento

- **`local`**: grava/lê arquivos sob `app.storage.local-dir`. É o default (testes e execução offline).
- **`s3`**: usa o AWS SDK v2 (`software.amazon.awssdk:s3`). Quando `aws.endpoint` está setado, o
  cliente aponta para MinIO/S3-compatível com `endpointOverride` + path-style. O bucket é criado
  automaticamente (`headBucket` → `createBucket`) no primeiro upload. Se `aws.enabled=false` o
  `S3Client` não existe e o `StorageService` reporta indisponível sem derrubar a aplicação.
- **Leitura**: o controller `MediaHttpController` serve `/media/**` via `StorageService.get(key)`,
  streamando os bytes com o `Content-Type` armazenado e `Cache-Control: public, max-age=3600`. A
  rota `/media/**` é pública em `SecurityConfig`.

## MinIO local (docker compose)

`docker compose up -d db minio minio-init` sobe o MinIO (`:9000` API, `:9001` console) e cria o bucket
`ficas-media` (privado) via `mc`. O serviço `api` (profile `full`) recebe `APP_STORAGE_PROVIDER=s3`,
`AWS_ENDPOINT=http://minio:9000` e as credenciais do MinIO. O bucket permanece privado — a leitura
canônica é o proxy `/media/**` do backend.
