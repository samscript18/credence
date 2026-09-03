import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getRoot(): { data: { name: string; phase: number } } {
    return { data: { name: "Credence API", phase: 2 } };
  }

  @Get("health")
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }
}
