-- ---- unit 1 ----
-- create a users table and seed rows.
CREATE TABLE users (
    id        INT PRIMARY KEY,
    name      VARCHAR(64) NOT NULL,
    active    BIT DEFAULT 1,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, name, active) VALUES
    (1, 'ada\n',  TRUE),
    (2, 'alan',    FALSE);

SELECT u.id, u.name, COUNT(@sessions) AS n
FROM users AS u
WHERE u.active = TRUE AND u.name LIKE 'a%' AND u.flags & b'0101' = 0x0A
GROUP BY u.id, u.name
ORDER BY n DESC;


-- ---- unit 2 ----
-- create a users table and seed rows.
CREATE TABLE users (
    id        INT PRIMARY KEY,
    name      VARCHAR(64) NOT NULL,
    active    BIT DEFAULT 1,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, name, active) VALUES
    (1, 'ada\n',  TRUE),
    (2, 'alan',    FALSE);

SELECT u.id, u.name, COUNT(@sessions) AS n
FROM users AS u
WHERE u.active = TRUE AND u.name LIKE 'a%' AND u.flags & b'0101' = 0x0A
GROUP BY u.id, u.name
ORDER BY n DESC;
