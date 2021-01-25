import { TextComponent } from "../../../../../lib/api/text";
import { GamemodeConfig } from "../../types";
import { Vector2 } from "../../../../../lib/types";

export const config: GamemodeConfig = {
  id: 0,
  name: "Zombies",
  title: new TextComponent()
    .setColor(15, 64, 27)
    .add("Z")
    .setColor(24, 75, 14)
    .add("o")
    .setColor(19, 53, 15)
    .add("m")
    .setColor(18, 65, 16)
    .add("b")
    .setColor(18, 40, 14)
    .add("i")
    .setColor(15, 64, 27)
    .add("e")
    .setColor(24, 75, 14)
    .add("s")
    .toString(),
  position: new Vector2(16.64, -2.46),
  box: {
    x: {
      min: 15.882200350957504,
      max: 17.329976348516063,
    },
    y: {
      min: -3.5199511711299323,
      max: -4.383001449607079,
    },
  },
};
