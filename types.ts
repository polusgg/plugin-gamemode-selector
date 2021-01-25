import { LobbyInstance } from "../../../lib/api/lobby";
import { Vector2 } from "../../../lib/types";

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
