import { PlayerPositionUpdatedEvent } from "@nodepolus/framework/src/api/events/player";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { BaseGamemode } from "../../baseGamemode";
import { config } from "./config";

export default class ZombiesGamemode extends BaseGamemode {
  constructor() {
    super(config);
    this.server.on("player.position.updated", this.wrap<PlayerPositionUpdatedEvent>(this.playerPositionUpdated, evt => evt.getPlayer().getLobby()));
    // this.server.on("game.ended", this.wrap<GameEndedEvent>(this.gameEnded, evt => evt.getGame().lobby));
  }

  playerPositionUpdated(): void {
    console.log("Player position updated when while zombies gamemode loaded");
  }

  selected(lobby: LobbyInstance): void {
    this.enabledLobbies.push(lobby);
  }

  deselected(lobby: LobbyInstance): void {
    this.enabledLobbies.splice(this.enabledLobbies.indexOf(lobby), 1);
  }
}
