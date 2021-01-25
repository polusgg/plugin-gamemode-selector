/**
 * This file loads the Polus map when creating a room and sets the lobby metatag "gamemode"
 */

import { FakeClientId, PlayerColor, PlayerHat, PlayerPet, PlayerSkin, SpawnFlag } from "../../../lib/types/enums";
import { GameDataPacket, RemovePlayerPacket } from "../../../lib/protocol/packets/root";
import { EntityPolusShipStatus } from "../../../lib/protocol/entities/polusShipStatus";
import { EntitySkeldShipStatus } from "../../../lib/protocol/entities/skeldShipStatus";
import { EntityLobbyBehaviour } from "../../../lib/protocol/entities/lobbyBehaviour";
import { PlayerData } from "../../../lib/protocol/entities/gameData/types";
import { UpdateGameDataPacket } from "../../../lib/protocol/packets/rpc";
import { EntityPlayer } from "../../../lib/protocol/entities/player";
import { RPCPacket } from "../../../lib/protocol/packets/gameData";
import { DisconnectReason, Vector2 } from "../../../lib/types";
import { InternalPlayer } from "../../../lib/player";
import { InternalLobby } from "../../../lib/lobby";
import { InternalHost } from "../../../lib/host";
import { Server } from "../../../lib/server";
import { Game } from "../../../lib/api/game";
import { BaseGamemode } from "./baseGamemode";
import { sayPortal } from "./sayPortal";
import { PlayerInstance } from "../../../lib/api/player";
import { EntityGameData } from "../../../lib/protocol/entities/gameData";

declare const server: Server;
declare const gamemodes: BaseGamemode[];

const wait = async (t: number): Promise<void> => new Promise(r => setTimeout(r, t));

export function initialize(): void {
  const alwaysInGameClient = server.getNextConnectionId();
  const logger = server.getLogger().child("Polus.gg");

  server.on("meeting.started", evt => evt.cancel(evt.getGame().lobby.getMeta("gamemode") === undefined));
  server.on("game.ended", evt => evt.cancel(evt.getGame().lobby.getMeta("gamemode") === undefined));
  server.on("room.sabotaged", evt => evt.cancel(evt.getGame().lobby.getMeta("gamemode") === undefined));

  server.on("player.position.updated", evt => {
    if (evt.getPlayer().getLobby().hasMeta("gamemode")) {
      return;
    }

    const gamemode = gamemodes.find(testGamemode => testGamemode.config.box.x.min <= evt.getNewPosition().getX() && testGamemode.config.box.x.max >= evt.getNewPosition().getX() && testGamemode.config.box.y.min >= evt.getNewPosition().getY() && testGamemode.config.box.y.max <= evt.getNewPosition().getY());

    if (gamemode === undefined) {
      return;
    }

    const lobby = evt.getPlayer().getLobby();
    const internalHost = (lobby.getHostInstance() as InternalHost);

    lobby.setMeta("gamemode", gamemode.config.id);
    gamemode.selected(lobby);
    lobby.getShipStatus()!.despawn();

    const skeldTempShipStatus = new EntitySkeldShipStatus(lobby, internalHost.getNextNetId());

    lobby.spawn(skeldTempShipStatus);
    skeldTempShipStatus.despawn();

    const lobbyBehaviour = new EntityLobbyBehaviour(lobby, internalHost.getNextNetId());

    lobby.spawn(lobbyBehaviour);

    const con = evt.getPlayer().getConnection();

    if (!con) {
      throw new Error("ETC....");
    }

    for (let i = 0; i < lobby.getPlayers().length; i++) {
      const player = lobby.getPlayers()[i];

      con.write(new GameDataPacket([
        new RPCPacket(lobby.getGameData()!.gameData.netId, new UpdateGameDataPacket([
          new PlayerData(
            (player as InternalPlayer).entity.playerControl.playerId,
            "",
            PlayerColor.Red,
            PlayerHat.None,
            PlayerPet.None,
            PlayerSkin.None,
            false,
            false,
            false,
            [],
          ),
        ])),
      ], lobby.getCode()));
    }

    con.write(new RemovePlayerPacket(lobby.getCode(), alwaysInGameClient, FakeClientId.ServerAsHost));
    con.write(new RemovePlayerPacket(lobby.getCode(), con.id, FakeClientId.ServerAsHost));
    (lobby as InternalLobby).ignoredNetIds.push(...((evt.getPlayer()! as InternalPlayer).entity.innerNetObjects.map(ino => ino.netId)));
    (lobby as InternalLobby).clearPlayers();
    lobby.getGameData()!.despawn();

    setTimeout(() => {
      const gameData = new EntityGameData(lobby, internalHost.getNextNetId(), [], internalHost.getNextNetId());

      lobby.spawn(gameData);

      const player = new EntityPlayer(
        lobby,
        con.id,
        internalHost.getNextNetId(),
        (evt.getPlayer()! as InternalPlayer).entity.playerControl.playerId,
        internalHost.getNextNetId(),
        internalHost.getNextNetId(),
        5,
        new Vector2(0, 0),
        new Vector2(0, 0),
        SpawnFlag.IsClientCharacter,
      );

      lobby.spawnPlayer(player, new PlayerData(
        (evt.getPlayer()! as InternalPlayer).entity.playerControl.playerId,
        "",
        PlayerColor.Red,
        PlayerHat.None,
        PlayerPet.None,
        PlayerSkin.None,
        false,
        false,
        false,
        [],
      ));

      player.playerControl.isNew = false;

      const player2 = evt.getPlayer();

      const playerData = gameData.gameData.players.find(d => {
        if (d.id == (player2 as InternalPlayer).entity.playerControl.playerId) {
          return true;
        }

        return false;
      });

      if (!playerData) {
        throw new Error("Player has no playerData");
      }

      playerData.isImpostor = false;

      gameData.gameData.updateGameData([playerData], lobby.getConnections());

      setTimeout(() => {
        (lobby as InternalLobby).setActingHost(con);
      }, 200);
    }, 200);
  });

  server.on("server.lobby.join", evt => {
    const lobby = evt.getLobby();

    if (lobby && !lobby.getMeta("gamemode") && lobby.getConnections().length !== 0) {
      evt.setDisconnectReason(DisconnectReason.custom("This lobby is selecting a gamemode. Rejoin when one is selected."));
      evt.cancel();
    }
  });

  server.on("player.spawned", evt => {
    if (evt.getLobby().getConnections().length == 1) {
      evt.setPosition(new Vector2(16.64, -2.46));
      evt.setNew(false);
    }
  });

  server.on("player.joined", async evt => {
    if (evt.isRejoining() || evt.getLobby().getConnections().length !== 1) {
      return;
    }

    const lobby = evt.getLobby();
    const connection = evt.getPlayer().getConnection();
    const internalHost = lobby.getHostInstance() as InternalHost;

    if (!connection) {
      throw new Error("No connection found for player");
    }

    evt.getPlayer().setName("");

    connection.isActingHost = false;

    const lobbyBehaviour = lobby.getLobbyBehaviour();

    if (lobbyBehaviour) {
      lobbyBehaviour.despawn();
    } else {
      logger.warn("New lobby didn't have a lobbyBehaviour when expected");
    }

    const shipStatus = new EntityPolusShipStatus(lobby, internalHost.getNextNetId());

    lobby.spawn(shipStatus);

    const shipStatusA = new EntitySkeldShipStatus(lobby, internalHost.getNextNetId());

    lobby.spawn(shipStatusA);

    shipStatusA.despawn();

    lobby.setShipStatus(shipStatus);

    (lobby as InternalLobby).setGame(new Game(lobby));

    for (let i = 0; i < gamemodes.length; i++) {
      const element = gamemodes[i];

      const sayPortalResult = sayPortal(element.config.title);

      const apiPlayers: PlayerInstance[] = new Array(sayPortalResult.length);

      for (let j = 0; j < sayPortalResult.length; j++) {
        const { name, positionOffset } = sayPortalResult[j];

        const playerId = internalHost.getNextPlayerId();

        const customEntityPlayer = new EntityPlayer(
          lobby,
          alwaysInGameClient,
          internalHost.getNextNetId(),
          playerId,
          internalHost.getNextNetId(),
          internalHost.getNextNetId(),
          5,
          element.config.position.add(positionOffset),
          new Vector2(0, 0),
          SpawnFlag.None,
        );

        customEntityPlayer.playerControl.isNew = false;

        apiPlayers[j] = lobby.spawnPlayer(customEntityPlayer, new PlayerData(
          playerId,
          "\n".repeat(10) + name,
          PlayerColor.Red,
          PlayerHat.None,
          PlayerPet.None,
          PlayerSkin.None,
          false,
          false,
          false,
          [],
        ));
      }

      await wait(55);

      for (let k = 0; k < apiPlayers.length; k++) {
        const apiPlayer = apiPlayers[k] as InternalPlayer;

        apiPlayer.entity.playerControl.playerId = 254;
        lobby.getConnections()[0].write(
          new GameDataPacket([
            apiPlayer.entity.playerControl.getData(),
          ], lobby.getCode()),
        );
      }
    }

    const gameData = lobby.getGameData();

    if (!gameData) {
      throw new Error("GameData non-existant");
    }
  });
}
