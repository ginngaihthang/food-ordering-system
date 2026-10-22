import { Setting } from '../models/index.js';

// Returns the single settings row, creating it with defaults the first time
export async function getSettings(): Promise<Setting> {
  const [settings] = await Setting.findOrCreate({ where: { id: 1 }, defaults: { id: 1 } });
  return settings;
}