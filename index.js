const express = require("express");
const axios = require("axios");
const ytdl = require("@distube/ytdl-core");
const fs = require("fs");
const path = require("path");
const app = express();
const mysql = require("mysql2");
const config = require("./config.json");
const PORT = config.Server.Port;
const HOST = config.Server.Host;
app.use(express.json());






const connection = mysql.createConnection({
  host: config.Database.Host,
  user: config.Database.User,
  password: config.Database.Password,
  database: config.Database.Database,
});

connection.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
    return;
  }
  console.log("Conexão ao banco de dados estabelecida.");
  





  console.log(`
    /$$             /$$                         /$$          
| $$            | $$                        |__/          
/$$$$$$$| $$  /$$$$$$  /$$$$$$    /$$$$$$  /$$$$$$$$ /$$ /$$$$$$$ 
/$$_____/| $$ |____  $$|_  $$_/   /$$__  $$|____ /$$/| $$| $$__  $$
|  $$$$$$ | $$  /$$$$$$$  | $$    | $$$$$$$$   /$$$$/ | $$| $$  \ $$
\____  $$| $$ /$$__  $$  | $$ /$$| $$_____/  /$$__/  | $$| $$  | $$
/$$$$$$$/| $$|  $$$$$$$  |  $$$$/|  $$$$$$$ /$$$$$$$$| $$| $$  | $$
|_______/ |__/ \_______/   \___/   \_______/|________/|__/|__/  |__/
                                                         
                                                         
                                                         
`)

console.log("Acessem: https://discord.gg/d34fsxSY =D")

});

app.get("/client/history", async (req, res) => {
  try {
    const url = `http://localhost/lafy/history.json`;
    const response = await axios.get(url);
    const historyData = response.data.last_played;

    const responses = await Promise.all(
      historyData.map(async (item) => {
        const songId = item.id;
        const url = `https://www.youtube.com/watch?v=${songId}`;
        const response = await axios.get(url);
        const html = response.data;
        const image_url = `https://i.ytimg.com/vi/${songId}/default.jpg`;
        const title = html.match(/<meta name="title" content="(.*?)">/)[1];
        const author = html.match(/<link itemprop="name" content="(.*?)">/)[1];
        return {
          id: songId,
          type: "SONG",
          embed: {
            _id: `${songId}`,
            image_url,
            name: title,
            author: author,
          }
        };
      })
    );

    res.status(200).json({ last_played: responses.filter(Boolean) });
  } catch (error) {
    console.error("Erro na requisição:", error);
    res.status(500).json({ error: "Ocorreu um erro na requisição." });
  }
});

app.post("/client/history", async (req, res) => {
  const url = `http://localhost/lafy/history.json`;
  const response = await axios.get(url);
  res.status(200).json(response.data);
});

app.post("/client/likes/:id", async (req, res) => {
  try {
    const _id = req.params.id;
    const x_player_id = req.headers["x-player-id"];
    const url = `https://www.youtube.com/watch?v=${_id}`;
    const response = await axios.get(url);
    const html = response.data;
    const image_url = `https://i.ytimg.com/vi/${_id}/default.jpg`;
    const title = html.match(/<meta name="title" content="(.*?)">/)[1];
    const author = html.match(/<link itemprop="name" content="(.*?)">/)[1];
    const selectQuery = `SELECT * FROM curtidas WHERE x_player_id = ?`;

    connection.query(
      selectQuery,
      [x_player_id],
      async (selectErr, selectResults) => {
        if (selectErr) {
          res.status(200).json([]);
          console.error("Erro ao buscar informações de curtidas:", selectErr);
          return;
        }

        let likedInfos = [];
        if (selectResults.length > 0) {
          likedInfos = JSON.parse(selectResults[0].infos);
        } else {
          const insertQuery = `INSERT INTO curtidas (x_player_id, infos) VALUES (?, ?)`;
          likedInfos.push({
            _id: _id,
            image_url: image_url,
            name: title,
            author: author,
            url: url,
          });

          connection.query(
            insertQuery,
            [x_player_id, JSON.stringify(likedInfos)],
            (insertErr) => {
              if (insertErr) {
                console.error(
                  "Erro ao inserir informações de curtidas:",
                  insertErr
                );
                res.status(500).json({
                  error: "Ocorreu um erro ao inserir informações de curtidas.",
                });
                return;
              }
              res.status(200).json(likedInfos);
            }
          );
          return;
        }

        const existingEntry = likedInfos.find((info) => info._id === _id);
        if (!existingEntry) {
          likedInfos.push({
            _id: _id,
            image_url: image_url,
            name: title,
            author: author,
            url: url,
          });

          const updateQuery = `UPDATE curtidas SET infos = ? WHERE x_player_id = ?`;

          connection.query(
            updateQuery,
            [JSON.stringify(likedInfos), x_player_id],
            (updateErr) => {
              if (updateErr) {
                console.error(
                  "Erro ao atualizar informações de curtidas:",
                  updateErr
                );
                res.status(500).json({
                  error:
                    "Ocorreu um erro ao atualizar informações de curtidas.",
                });
                return;
              }
              res.status(200).json(likedInfos);
            }
          );
        } else {
          res.status(200).json(likedInfos);
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ocorreu um erro ao processar o ID." });
  }
});

app.get("/client/playlist", async (req, res) => {
  try {
    const { songs } = req.query;
    if (!songs) {
      res.status(400).json({ error: 'Parâmetro "songs" é obrigatório.' });
      return;
    }
    const songIds = songs.split(",");
    const responses = [];
    await Promise.all(
      songIds.map(async (songId) => {
        const url = `https://www.youtube.com/watch?v=${songId}`;
        const response = await axios.get(url);
        const html = response.data;
        const image_url = `https://i.ytimg.com/vi/${songId}/default.jpg`;
        const title = html.match(/<meta name="title" content="(.*?)">/)[1];
        const author = html.match(/<link itemprop="name" content="(.*?)">/)[1];
        responses.push({
          _id: `${songId}`,
          image_url,
          name: title,
          author: author,
        });
      })
    );
    res.status(200).json(responses.filter(Boolean));
  } catch (error) {
    console.error("Erro na requisição:", error);
    res.status(500).json({ error: "Ocorreu um erro na requisição." });
  }
});

app.get("/client/likes", async (req, res) => {
  try {
    const x_player_id = req.headers["x-player-id"];
    const selectQuery = `SELECT infos FROM curtidas WHERE x_player_id = ?`;

    connection.query(selectQuery, [x_player_id], async (selectErr, selectResults) => {
      if (selectErr) {
        console.error("Erro ao buscar informações de curtidas:", selectErr);
        res.status(200).json([]);
        return;
      }
      if (selectResults.length === 0) {
        res.status(200).json([]);
        return;
      }
      const likedInfos = JSON.parse(selectResults[0].infos);
      const likedIds = likedInfos
        .filter((info) => info !== null)
        .map((info) => info._id);

      const responses = await Promise.all(
        likedIds.map(async (songId) => {
          const url = `https://www.youtube.com/watch?v=${songId}`;
          const response = await axios.get(url);
          const html = response.data;
          const image_url = `https://i.ytimg.com/vi/${songId}/default.jpg`;
          const title = html.match(/<meta name="title" content="(.*?)">/)[1];
          const author = html.match(/<link itemprop="name" content="(.*?)">/)[1];
          return {
            _id: songId,
            image_url,
            name: title,
            author: author,
          };
        })
      );

      res.status(200).json(responses.filter(Boolean));
    });
  } catch (error) {
    res.status(200).json([]);
  }
});

app.get("/client/playlists", async (req, res) => {
  try {
    const x_player_id = req.headers["x-player-id"];

    connection.query(
      "SELECT playlists FROM playlists WHERE x_player_id = ?",
      [x_player_id],
      (err, results) => {
        if (err) {
          res.status(200).json([]);
          return;
        }

        if (results.length === 0) {
          res.status(200).json([]);
        } else {
          const playlists = JSON.parse(results[0].playlists);
          res.status(200).json(playlists);
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ocorreu um erro ao obter as playlists." });
  }
});

app.post("/client/playlists", async (req, res) => {
  try {
    const x_player_id = req.headers["x-player-id"];
    const { name, image_url } = req.body;

    connection.query(
      "SELECT playlists FROM playlists WHERE x_player_id = ?",
      [x_player_id],
      (err, results) => {
        if (err) {
          res.status(200).json([]);
          return;
        }

        let playlistsArray = [];
        if (results.length > 0) {
          playlistsArray = JSON.parse(results[0].playlists);
        }

        const lastPlaylist = playlistsArray[playlistsArray.length - 1];
        const lastId = lastPlaylist ? lastPlaylist.id : 0;
        const nextId = lastId + 1;

        const newPlaylist = {
          id: nextId,
          _id: name,
          name,
          image_url,
          songs: [],
        };

        playlistsArray.push(newPlaylist);

        if (results.length === 0) {
          connection.query(
            "INSERT INTO playlists (x_player_id, playlists) VALUES (?, ?)",
            [x_player_id, JSON.stringify([newPlaylist])],
            (insertErr) => {
              if (insertErr) {
                res.status(200).json([]);
                return;
              }

              res.status(200).json(newPlaylist);
            }
          );
        } else {
          connection.query(
            "UPDATE playlists SET playlists = ? WHERE x_player_id = ?",
            [JSON.stringify(playlistsArray), x_player_id],
            (updateErr) => {
              if (updateErr) {
                res.status(200).json([]);
                return;
              }

              res.status(200).json(newPlaylist);
            }
          );
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ocorreu um erro ao salvar a playlist." });
  }
});

app.post("/client/playlists/:playlistId/:songId", async (req, res) => {
  try {
    const playlistId = req.params.playlistId;
    const songId = req.params.songId;

    connection.query(
      "SELECT playlists FROM playlists WHERE x_player_id = ?",
      [req.headers["x-player-id"]],
      (err, results) => {
        if (err) {
          console.error("Erro ao obter playlists:", err);
          res
            .status(500)
            .json({ error: "Ocorreu um erro ao obter as playlists." });
          return;
        }

        if (results.length === 0) {
          res.status(404).json({ error: "Playlist não encontrada." });
        } else {
          const playlists = JSON.parse(results[0].playlists);
          const targetPlaylist = playlists.find(
            (playlist) => playlist._id === playlistId
          );

          if (!targetPlaylist) {
            res.status(404).json({ error: "Playlist não encontrada." });
            return;
          }

          targetPlaylist.songs.push(songId);

          connection.query(
            "UPDATE playlists SET playlists = ? WHERE x_player_id = ?",
            [JSON.stringify(playlists), req.headers["x-player-id"]],
            (updateErr) => {
              if (updateErr) {
                console.error("Erro ao atualizar a playlist:", updateErr);
                res
                  .status(500)
                  .json({ error: "Ocorreu um erro ao atualizar a playlist." });
                return;
              }

              res.status(200).json(targetPlaylist);
            }
          );
        }
      }
    );
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Ocorreu um erro ao adicionar a música à playlist." });
  }
});

app.post("/client/download", async (req, res) => {
  const { songs } = req.body;

  if (!songs || !Array.isArray(songs)) {
    return res.status(400).json({
      error: 'O parâmetro "songs" deve ser um array de IDs de músicas.',
    });
  }

  try {
    const responses = await Promise.all(
      songs.slice(0, 1).map(async (songId) => {
        const permalink_url = `https://www.youtube.com/watch?v=${songId}`;
        const response = await axios.get(`https://www.youtube.com/watch?v=${songId}`);
        const html = response.data;
        const image_url = `https://i.ytimg.com/vi/${songId}/default.jpg`;
        const title = html.match(/<meta name="title" content="(.*?)">/)[1];
        const author = html.match(/<link itemprop="name" content="(.*?)">/)[1];

        try {
          // Checa se o arquivo já foi baixado
          const filePath = path.join(__dirname, 'downloads', `${songId}.mp3`);
          if (fs.existsSync(filePath)) {
            return {
              _id: `${songId}`,
              url: `http://${HOST}:${PORT}/downloads/${songId}.mp3`,
              image_url,
              name: title,
              author,
              filePath,
            };
          }

          const writer = fs.createWriteStream(filePath);
          const stream = ytdl(permalink_url, { filter: 'audioonly' });

          stream.on('error', (error) => {
            console.error("Erro ao baixar o vídeo do YouTube:", error);
            writer.close();
            fs.unlinkSync(filePath); // Remover arquivo imcompleto
          });

          stream.pipe(writer);

          return new Promise((resolve, reject) => {
            writer.on('finish', () => {
              console.log(`Download concluído: ${filePath}`);
              resolve({
                _id: `${songId}`,
                url: `http://${HOST}:${PORT}/downloads/${songId}.mp3`,
                image_url,
                name: title,
                author,
                filePath,
              });
            });
            writer.on('error', (error) => {
              console.error("Erro ao salvar o arquivo:", error);
              reject(error);
            });
          });
        } catch (error) {
          console.error("Erro ao baixar o vídeo do YouTube:", error);
          return null;
        }
      })
    );

    res.json(responses.filter(response => response !== null && response !== undefined));
  } catch (error) {
    console.error("Erro na requisição:", error);
    res.status(500).json({ error: "Ocorreu um erro na requisição." });
  }
});

app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

app.get("/client/search", async (req, res) => {
  const { title } = req.query;

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`;
    const response = await axios.get(url);
    const html = response.data;
    const videoIds = [...new Set([...html.matchAll(/"videoId":"(.*?)"/g)].map(match => match[1]))];
    const responseData = videoIds.map(videoId => {
      const titleMatch = html.match(new RegExp(`"videoId":"${videoId}".*?"title":{"runs":\\[{"text":"(.*?)"`));
      const channelMatch = html.match(new RegExp(`"videoId":"${videoId}".*?"longBylineText":{"runs":\\[{"text":"(.*?)"`));
      return {
        id: { videoId },
        snippet: {
          title: titleMatch ? titleMatch[1] : "Unknown Title",
          channelTitle: channelMatch ? channelMatch[1] : "Unknown Channel",
          thumbnails: {
            default: {
              url: `https://i.ytimg.com/vi/${videoId}/default.jpg`
            }
          }
        }
      };
    });

    const formattedData = responseData.map((result) => ({
      _id: `${result.id.videoId}`,
      image_url: result.snippet.thumbnails.default.url,
      name: result.snippet.title,
      author: result.snippet.channelTitle,
    }));

    res.json(formattedData);
  } catch (error) {
    console.error("Erro na requisição:", error);
    res.status(500).json({ error: "Ocorreu um erro na requisição." });
  }
});

// Função para deletar arquivos que estão na pasta de downloads há mais de 15 minutos
function deleteOldDownloads() {
  const downloadDir = path.join(__dirname, 'downloads');
  fs.readdir(downloadDir, (err, files) => {
    if (err) {
      console.error("Erro ao ler a pasta de downloads:", err);
      return;
    }

    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutos em milissegundos

    files.forEach(file => {
      const filePath = path.join(downloadDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error("Erro ao obter informações do arquivo:", err);
          return;
        }

        // Verifica se o arquivo foi criado há mais de 15 minutos
        if (now - stats.mtimeMs > fifteenMinutes) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error("Erro ao deletar o arquivo:", err);
            } else {
              console.log(`Arquivo deletado: ${filePath}`);
            }
          });
        }
      });
    });
  });
}

// Chama a função a cada 5 minutos
setInterval(deleteOldDownloads, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Aplicaçao rodando em http://${HOST}:${PORT}`);


});
