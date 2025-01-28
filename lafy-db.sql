CREATE DATABASE IF NOT EXISTS `lafy`;
USE `lafy`;
CREATE TABLE IF NOT EXISTS `curtidas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `x_player_id` varchar(110) NOT NULL,
  `infos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`infos`)),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `playlists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `x_player_id` varchar(110) NOT NULL,
  `playlists` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`playlists`)),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;