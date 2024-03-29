/**
 * This file loads the Polus map when creating a room and sets the lobby metatag "gamemode"
 */

import { FakeClientId, PlayerColor, PlayerHat, PlayerPet, PlayerSkin, SpawnFlag } from "@nodepolus/framework/src/types/enums";
import { GameDataPacket, RemovePlayerPacket } from "@nodepolus/framework/src/protocol/packets/root";
import { EntityPolusShipStatus } from "@nodepolus/framework/src/protocol/entities/shipStatus/polus";
import { EntitySkeldShipStatus } from "@nodepolus/framework/src/protocol/entities/shipStatus/skeld";
import { EntityLobbyBehaviour } from "@nodepolus/framework/src/protocol/entities/lobbyBehaviour";
import { PlayerData } from "@nodepolus/framework/src/protocol/entities/gameData/types";
import { UpdateGameDataPacket } from "@nodepolus/framework/src/protocol/packets/rpc";
import { EntityPlayer } from "@nodepolus/framework/src/protocol/entities/player";
import { RpcPacket } from "@nodepolus/framework/src/protocol/packets/gameData";
import { DisconnectReason, Vector2 } from "@nodepolus/framework/src/types";
import { Player } from "@nodepolus/framework/src/player";
import { Lobby } from "@nodepolus/framework/src/lobby";
import { Host } from "@nodepolus/framework/src/host";
import { Server } from "@nodepolus/framework/src/server";
import { Game } from "@nodepolus/framework/src/api/game";
import { BaseGamemode } from "./baseGamemode";
import { sayPortal } from "./sayPortal";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { EntityGameData } from "@nodepolus/framework/src/protocol/entities/gameData";

declare const server: Server;
declare const gamemodes: BaseGamemode[];

const wait = async (t: number): Promise<void> => new Promise(r => setTimeout(r, t));

export function initialize(): void {
  const alwaysInGameClient = server.getNextConnectionId();
  const logger = server.getLogger().child("Polus.gg");

  server.on("meeting.started", evt => { evt.cancel(evt.getGame().getLobby().getMeta("gamemode") === undefined) });
  server.on("game.ended", evt => { evt.cancel(evt.getGame().getLobby().getMeta("gamemode") === undefined) });
  server.on("room.sabotaged", evt => { evt.cancel(evt.getGame().getLobby().getMeta("gamemode") === undefined) });

  server.on("player.position.updated", evt => {
    if (evt.getPlayer().getLobby().hasMeta("gamemode")) {
      return;
    }

    const gamemode = gamemodes.find(testGamemode => testGamemode.config.box.x.min <= evt.getNewPosition().getX() && testGamemode.config.box.x.max >= evt.getNewPosition().getX() && testGamemode.config.box.y.min >= evt.getNewPosition().getY() && testGamemode.config.box.y.max <= evt.getNewPosition().getY());

    if (gamemode === undefined) {
      return;
    }

    const lobby = evt.getPlayer().getLobby();
    const internalHost = (lobby.getHostInstance() as Host);

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

      con.writeReliable(new GameDataPacket([
        new RpcPacket(lobby.getSafeGameData().getGameData().getNetId(), new UpdateGameDataPacket([
          new PlayerData(
            (player as Player).getEntity().getPlayerControl().getPlayerId(),
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

    con.writeReliable(new RemovePlayerPacket(lobby.getCode(), alwaysInGameClient, FakeClientId.ServerAsHost, DisconnectReason.serverRequest()));
    con.writeReliable(new RemovePlayerPacket(lobby.getCode(), con.getId(), FakeClientId.ServerAsHost, DisconnectReason.serverRequest()));
    (lobby as Lobby).ignoredNetIds.push(...((evt.getPlayer()! as Player).getEntity().getObjects().map(ino => ino.getNetId())));
    (lobby as Lobby).clearPlayers();
    lobby.getGameData()!.despawn();

    setTimeout(() => {
      const gameData = new EntityGameData(lobby, internalHost.getNextNetId(), [], internalHost.getNextNetId());

      lobby.spawn(gameData);

      const player = new EntityPlayer(
        lobby,
        con.getId(),
        internalHost.getNextNetId(),
        (evt.getPlayer()! as Player).getEntity().getPlayerControl().getPlayerId(),
        internalHost.getNextNetId(),
        internalHost.getNextNetId(),
        5,
        new Vector2(0, 0),
        new Vector2(0, 0),
        SpawnFlag.IsClientCharacter,
      );

      lobby.spawnPlayer(player, new PlayerData(
        (evt.getPlayer()! as Player).getEntity().getPlayerControl().getPlayerId(),
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

      player.getPlayerControl().setNewPlayer(false);

      const player2 = evt.getPlayer();

      const playerData = [...gameData.getGameData().getPlayers().values()].find(d => {
        if (d.getId() == (player2 as Player).getEntity().getPlayerControl().getPlayerId()) {
          return true;
        }

        return false;
      });

      if (!playerData) {
        throw new Error("Player has no playerData");
      }

      playerData.setImpostor(false);

      gameData.getGameData().updateGameData([playerData], lobby.getConnections());

      setTimeout(() => {
        con.setActingHost(true);
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
    const internalHost = lobby.getHostInstance() as Host;

    if (!connection) {
      throw new Error("No connection found for player");
    }

    evt.getPlayer().setName("");

    connection.setActingHost(false);

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

    (lobby as Lobby).setGame(new Game(lobby));

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

        customEntityPlayer.getPlayerControl().setNewPlayer(false);

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
        const apiPlayer = apiPlayers[k] as Player;

        apiPlayer.getEntity().getPlayerControl().setPlayerId(254);
        lobby.getConnections()[0].writeReliable(
          new GameDataPacket([
            apiPlayer.getEntity().getPlayerControl().serializeData(),
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
