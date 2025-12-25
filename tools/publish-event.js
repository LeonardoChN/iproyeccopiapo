/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const https = require("https");

function extractField(body, fieldId) {
  // GitHub Issue Forms renderiza campos como:
  // ### Título del evento
  // valor
  const re = new RegExp(`###\\s+${fieldId}[\\s\\S]*?\\n\\n([^#][\\s\\S]*?)(?=\\n\\n###|\\n\\n$)`, "i");
  const m = body.match(re);
  if (!m) return null;
  return m[1].trim();
}

function firstUrl(text) {
  const m = text.match(/https?:\/\/[^\s)]+/i);
  return m ? m[0] : null;
}

function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // redirect
        file.close();
        fs.unlinkSync(destPath);
        return resolve(downloadToFile(res.headers.location, destPath));
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      file.close();
      try { fs.unlinkSync(destPath); } catch {}
      reject(err);
    });
  });
}

async function main() {
  const body = process.env.ISSUE_BODY || "";
  const issueNumber = process.env.ISSUE_NUMBER || "0";

  // OJO: estos textos deben coincidir con los labels del formulario.
  const title = extractField(body, "Título del evento") || extractField(body, "Título") || null;
  const date = extractField(body, "Fecha y hora") || null;
  const description = extractField(body, "Descripción") || null;
  const imageBlock = extractField(body, "Imagen del evento") || null;

  if (!title || !date || !description || !imageBlock) {
    throw new Error("Faltan campos requeridos en el Issue Form.");
  }

  const imageUrl = firstUrl(imageBlock);
  if (!imageUrl) {
    throw new Error("No se encontró URL de imagen. Deben adjuntar la imagen en el formulario (arrastrar/pegar).");
  }

  // 1) Guardar imagen en repo
  const outDir = path.join(process.cwd(), "images", "eventos");
  fs.mkdirSync(outDir, { recursive: true });

  // Intentar sacar extensión de la URL
  let ext = ".png";
  const extMatch = imageUrl.toLowerCase().match(/\.(png|jpg|jpeg|webp)(\?|$)/);
  if (extMatch) ext = "." + extMatch[1].replace("jpeg", "jpg");

  const fileName = `event_${issueNumber}_${Date.now()}${ext}`;
  const localPath = path.join(outDir, fileName);
  await downloadToFile(imageUrl, localPath);

  const imagePathForSite = `images/eventos/${fileName}`;

  // 2) Insertar evento arriba y mantener 3
  const eventsPath = path.join(process.cwd(), "events.json");
  const events = JSON.parse(fs.readFileSync(eventsPath, "utf8"));

  const newEvent = {
    title,
    date,
    image: imagePathForSite,
    description,
  };

  const updated = [newEvent, ...events].slice(0, 3);
  fs.writeFileSync(eventsPath, JSON.stringify(updated, null, 2) + "\n", "utf8");

  console.log("Evento publicado:", newEvent);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
