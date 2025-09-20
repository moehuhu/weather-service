-- Migration number: 0001 	 2024-12-27T22:04:18.794Z
CREATE TABLE IF NOT EXISTS position_weather (
    id INTEGER PRIMARY KEY NOT NULL,
    longitude REAL NOT NULL,
    latitude REAL NOT NULL,
    weather TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
);