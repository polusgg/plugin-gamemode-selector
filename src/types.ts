import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { Vector2 } from "@nodepolus/framework/src/types";

export type GamemodeConfig = {
  id: number;
  name: string;
  title: string;
  position: Vector2;
  box: {
    x: {
      min: number;
      max: number;
    };
    y: {
      min: number;
      max: number;
    };
  };
};

export type GamemodeEvents = {
  start: LobbyInstance;
};
