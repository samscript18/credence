import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getRoot(): { data: { name: string; phase: number } } {
    return { data: { name: "Credence API", phase: 0 } };
  }
}
