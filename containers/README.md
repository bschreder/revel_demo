# External services

External services created as docker containers via the docker-compose file

## External services

- redis v8
- mongodb v7
- mongo-express

## Commands

- docker compose up -d
- docker compose down --remove-orphans -v

## Mongo-Express

- url: http://localhost:8081/
- uname: admin
- pwd: pass


##  Persisted data
- MongoDB
  - Persisted data:  docker volume inspect containers_mongodata
  - Folder:  /var/lib/docker/volumes/containers_mongodata/_data
- Redis
  - Persisted data:  docker volume inspect containers_redisdata
  - Folder:  /var/lib/docker/volumes/containers_redisdata/_data