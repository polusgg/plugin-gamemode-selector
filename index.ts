import { Server } from "@nodepolus/framework/src/server";
import { getGamemodes } from "./src/gamemodeLoader";
import * as mapLoader from "./src/mapLoader";

declare const server: Server;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).logger = server.getLogger("Polus.gg");

(async (): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).gamemodes = await getGamemodes();

  mapLoader.initialize();
})();
