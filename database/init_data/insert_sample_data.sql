-- Sample Users
INSERT INTO Users (Username, Password, Balance) VALUES
('DanielB@icloud.com', '1234', 1000),
('Chip@BuffBets.com', '5678', 500),
('Noah@buffbets.com', '1111', 800),
('Sam@buffbets.com', '2222', 600);

-- Sample Events
INSERT INTO Events (Sport, Description, Time, Team1, Team2, Team1Odds, Team2Odds, OverUnderLine, TotalBets, WinLose) VALUES
('Football', 'CU vs CSU - Rivalry game!', '2025-04-05 18:00:00', 'CU', 'CSU', -150, +180, 47.5, 2, true),
('Basketball', 'Nuggets vs Lakers - Playoffs', '2025-04-07 20:30:00', 'Nuggets', 'Lakers', -110, +140, 222.5, 3, false);

-- Sample Bets (Moneyline and Over/Under)
INSERT INTO Bets (UserID, EventID, Amount, BetType, BetDetail, WinLose) VALUES
(1, 1, 100, 'Over/Under', 'Over', true),
(2, 2, 50, 'Over/Under', 'Under', false),
(3, 1, 75, 'Moneyline', 'CU -150', true),
(4, 2, 120, 'Moneyline', 'Lakers +140', false),
(1, 2, 60, 'Moneyline', 'Nuggets -110', true),
(2, 1, 30, 'Over/Under', 'Over', false);

-- Sample Friendships
INSERT INTO Friendships (UserID, FriendID) VALUES
(1, 2),
(1, 3),
(2, 4),
(3, 4);

-- Sample Transactions
INSERT INTO Transactions (UserID, Amount, Type) VALUES
(1, 500, 'deposit'),
(2, 500, 'deposit'),
(3, 300, 'deposit'),
(4, 200, 'deposit'),
(1, 100, 'bet'),
(2, 50, 'bet'),
(3, 75, 'bet'),
(4, 120, 'bet'),
(1, 60, 'bet');
