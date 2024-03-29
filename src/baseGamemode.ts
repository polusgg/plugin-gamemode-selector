import Emittery from "emittery";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { Logger } from "@nodepolus/framework/src/logger";
import { Server } from "@nodepolus/framework/src/server";
import { GamemodeConfig } from "./types";

declare const server: Server;
declare const logger: Logger;

export type GamemodeEvents = {
  example: boolean;
};

export abstract class BaseGamemode extends Emittery<GamemodeEvents> {
  public readonly server: Server = server;
  public readonly logger: Logger;
  public enabledLobbies: LobbyInstance[] = [];

  constructor(
    public config: GamemodeConfig,
  ) {
    super();

    this.logger = logger.child(config.name);
  }

  abstract selected(lobby: LobbyInstance): void;
  abstract deselected(lobby: LobbyInstance): void;

  wrap<T>(fn: (evt: T) => void, lobbyGetter: (evt: T) => LobbyInstance): (evt: T) => void {
    return (evt: T): void => {
      if (this.enabledLobbies.includes(lobbyGetter(evt))) {
        fn(evt);
      }
    };
  }
}
