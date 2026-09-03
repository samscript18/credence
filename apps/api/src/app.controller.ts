import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getRoot(): { data: { name: string; status: string } } {
    return { data: { name: "Credence API", status: "ready" } };
  }

  @Get("health")
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }
}
