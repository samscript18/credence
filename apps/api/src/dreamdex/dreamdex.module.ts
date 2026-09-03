import { Global, Module } from "@nestjs/common";

import { DreamDexService } from "./dreamdex.service.js";

@Global()
@Module({
  providers: [DreamDexService],
  exports: [DreamDexService],
})
export class DreamDexModule {}
