# TODOs to enhance the project


## Final video

- explain postgres vs mongodb decision
- how to setup, build, and use application

## Feature Enhancements

- Complete authentication middleware => OAuth

- OpenAPI: Implement fastify-swagger and register api endpoints. This could replace or be used in conjunction with `docs/openapi.json`

- Pass logger into controller

- Fix lint errors

- Improve endpoint completeness.  Add authenticated GET/LIST/UPDATE/DELETE endpoints as needed to help manage journeys (view/list/update/delete) operationally.

- Persist run history and node transitions in MongoDb to improve observability and auditability.

## Security Enhancements

- Add sensitive files to .gitignore. I didn't do this since it's just a demo environment
- Remove sensitive configuration from docker-compose.yml file
