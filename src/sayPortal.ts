import { TextComponent } from "@nodepolus/framework/src/api/text";
import { Vector2 } from "@nodepolus/framework/src/types";

export function sayPortal(_name: string): {
  name: string;
  positionOffset: Vector2;
}[] {
  return [
    {
      name: new TextComponent().add("\n\nWalk Here for {GameMode}").setColor(0, 0, 0)
        .add("\n\n_____________\n|                           |\n|                           |\n|                           |")
        .toString(),
      positionOffset: new Vector2(0, 0),
    },
    {
      name: new TextComponent().setColor(0, 0, 0).add("\n\n\n\n|                           |\n|                           |\n|                           |\n|                           |")
        .toString(),
      positionOffset: new Vector2(0, -0.28),
    },
    {
      name: new TextComponent().setColor(0, 0, 0).add("_____________")
        .toString(),
      positionOffset: new Vector2(0, -1.42),
    },
    {
      name: new TextComponent().setColor(0, 0, 0).add("_____________")
        .toString(),
      positionOffset: new Vector2(0, -1.42),
    },
  ];
}
