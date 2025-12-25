/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const https = require("https");

function firstUrl(text) {
  const m = String(text || "").match(/https?:\/\/[^\s)]+/i);
  return m ? m[0] : null;
}

function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          try { fs.unlinkSync(destPath); } catch {}
          return resolve(downloadToFile(res.headers.location, destPath));
        }
        if (res.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(destPath); } catch {}
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        file.close();
        try { fs.unlinkSync(destPath); } catch {}
        reject(err);
      });
  });
}

async function main() {
  const parsed = process.env.PARSED_ISSUE;
  const issueNumber = process.env.ISSUE_NUMBER || "0";

  if (!parsed) throw new Error("No llegó PARSED_ISSUE desde el workflow.");

  // El parser devuelve un JSON con keys = id del formulario (title, date, description, image)
  const data = JSON.parse(parsed);

  const title = (data.title || "").trim();
  const date = (data.date || "").trim();
  const description = (data.description || "").trim();
  const imageBlock = (data.image || "").trim();

  if (!title || !date || !description || !imageBlock) {
    console.log("DEBUG parsed issue:", data);
    throw new Error("Faltan campos requeridos en el Issue Form (title/date/description/image).");
  }

  const imageUrl = firstUrl(imageBlock);
  if (!imageUrl) {
    throw new Error("No se encontró URL en el campo imagen. Deben arrastrar/pegar la imagen para que aparezca el link.");
  }

  // Guardar imagen
  const outDir = path.join(process.cwd(), "images", "eventos");
  fs.mkdirSync(outDir, { recursive: true });

  let ext = ".png";
  const extMatch = imageUrl.toLowerCase().match(/\.(png|jpg|jpeg|webp)(\?|$)/);
  if (extMatch) ext = "." + extMatch[1].replace("jpeg", "jpg");

  const fileName = `event_${issueNumber}_${Date.now()}${ext}`;
  const localPath = path.join(outDir, fileName);
  await downloadToFile(imageUrl, localPath);

  const imagePathForSite = `images/eventos/${fileName}`;

  // Actualizar events.json (mantener top 3)
  const eventsPath = path.join(process.cwd(), "events.json");
  const events = JSON.parse(fs.readFileSync(eventsPath, "utf8"));

  const newEvent = { title, date, image: imagePathForSite, description };
  const updated = [newEvent, ...events].slice(0, 3);

  fs.writeFileSync(eventsPath, JSON.stringify(updated, null, 2) + "\n", "utf8");
  console.log("Evento publicado:", newEvent);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
