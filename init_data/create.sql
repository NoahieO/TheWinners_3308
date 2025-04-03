DROP TABLE IF EXISTS users;
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(200) NOT NULL,
  balance DECIMAL
);

DROP TABLE IF EXISTS friends;
CREATE TABLE users (
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    friend_id INT NOT NULL
);

DROP TABLE IF EXISTS bets;
CREATE TABLE bets (
  user_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  amount INT,
  type VARCHAR(100),
  WinLose BIT,
  FOREIGN KEY (WinLose) REFERENCES events (WinLose),
  event_id INT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events (event_id)
);

DROP TABLE IF EXISTS events;
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    total_bets INT,
    event_time VARCHAR(100),
    WinLose BIT
);