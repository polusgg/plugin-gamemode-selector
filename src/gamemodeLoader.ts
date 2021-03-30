import fs from "fs/promises";
import path from "path";
import { BaseGamemode } from "./baseGamemode";

export async function getGamemodes(): Promise<BaseGamemode[]> {
  const results: BaseGamemode[] = [];

  const pathToGamemodes = path.join(__dirname, "./gamemodes/");
  const gamemodeDirectories = await fs.readdir(pathToGamemodes);

  for (let i = 0; i < gamemodeDirectories.length; i++) {
    const pathToGamemode = path.join(pathToGamemodes, gamemodeDirectories[i]);

    // eslint-disable-next-line new-cap
    const gamemode: BaseGamemode = new (await import(path.join(pathToGamemode, "index"))).default();

    results.push(gamemode);
  }

  return results;
}
