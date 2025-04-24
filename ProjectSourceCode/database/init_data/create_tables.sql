-- Users Table
CREATE TABLE Users (
    UserID SERIAL PRIMARY KEY,
    Username VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(200) NOT NULL,
    Balance INT DEFAULT 0
);

-- Events Table
-- CREATE TABLE Events (
--     EventID SERIAL PRIMARY KEY,
--     Sport VARCHAR(50),
--     Description TEXT,
--     Time TIMESTAMP,
--     Team1 VARCHAR(100),
--     Team2 VARCHAR(100),
--     Team1Odds INT,              -- ex. -150
--     Team2Odds INT,              -- ex. +180
--     OverUnderLine DECIMAL(4,1), -- ex. 47.5
--     TotalBets INT DEFAULT 0,
--     WinLose BOOLEAN             -- NULL until result is known
-- );

-- Bets Table
CREATE TABLE Bets (
    BetID SERIAL PRIMARY KEY,
    UserID INT REFERENCES Users(UserID) ON DELETE CASCADE,
    EventID VARCHAR(200),
    Amount INT NOT NULL,
    BetType VARCHAR(20) CHECK (BetType IN ('Moneyline', 'Over/Under')),
    BetDetail VARCHAR(100), -- this is the team that the user bet on
    BetLine INT, -- ex 100, -250
    Payout INT DEFAULT 0,
    WinLose BOOLEAN
);


-- Friendships Table
CREATE TABLE Friendships (
    UserID INT REFERENCES Users(UserID) ON DELETE CASCADE, 
    FriendID INT REFERENCES Users(UserID) ON DELETE CASCADE,
    PRIMARY KEY (UserID, FriendID)
);

-- Transactions Table
CREATE TABLE Transactions (
    TransactionID SERIAL PRIMARY KEY,
    UserID INT REFERENCES Users(UserID) ON DELETE CASCADE,
    Amount INT NOT NULL,
    Type VARCHAR(20), -- ex. 'deposit', 'bet', 'win'
    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UserBetHistory View
CREATE VIEW UserBetHistory AS
SELECT 
    B.BetID,
    B.EventID,
    U.UserID,
    U.Username AS Username,
    B.BetType,
    B.BetDetail,
    B.Amount,
    B.BetLine,
    B.Payout,
    B.WinLose
FROM Bets B
JOIN Users U ON B.UserID = U.UserID;