import { int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const weatherTable = sqliteTable("position_weather", {
  id: int().primaryKey({ autoIncrement: true }),
  longitude: real().notNull(),
  latitude: real().notNull(),
  weather: text().notNull(),
  updated_at: int().notNull(),
});
