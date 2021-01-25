import { Server } from "../../../lib/server";
import { getGamemodes } from "./gamemodeLoader";
import * as mapLoader from "./mapLoader";

declare const server: Server;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).logger = server.getLogger("Polus.gg");

(async (): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).gamemodes = await getGamemodes();

  mapLoader.initialize();
})();
