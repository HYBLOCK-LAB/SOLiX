import Fastify, { type FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { logger } from "../../shared/logger";
import { RunController } from "./controllers/run-controller";

export class HttpServer {
  private readonly app: FastifyInstance;

  constructor(
    private readonly runController: RunController,
    private readonly port: number
  ) {
    this.app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
  }

  async start() {
    await this.registerPlugins();
    this.runController.registerRoutes(this.app);

    await this.app.listen({ port: this.port, host: "0.0.0.0" });
    logger.info({ port: this.port }, "HTTP server listening");
  }

  async stop() {
    await this.app.close();
  }

  private async registerPlugins() {
    await this.app.register(swagger, {
      openapi: {
        info: {
          title: "SOLiX Committee API",
          version: "0.1.0",
        },
      },
    });

    await this.app.register(swaggerUi, {
      routePrefix: "/docs",
    });
  }
}
