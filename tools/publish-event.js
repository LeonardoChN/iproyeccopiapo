/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const https = require("https");

function extractById(body, id) {
  // Busca secciones como:
  // ### Título del evento
  // ...
  // Pero de forma más tolerante:
  // - acepta espacios
  // - acepta texto extra
  // - toma el bloque hasta el próximo ###
  const re = new RegExp(`###\\s+[^\\n]*\\n+([\\s\\S]*?)(?=\\n###\\s+|\\n$)`, "g");
  // Como no podemos mapear por label de forma confiable, usaremos "id markers" si existen:
  // Sin markers, caemos a parseo por orden (ver fallback).
  return null;
}

function getSections(body) {
  // Devuelve lista de bloques en el orden del formulario:
  // [ {heading, content} ... ]
  const re = /###\s+([^\n]+)\n+([\s\S]*?)(?=\n###\s+|\n$)/g;
  const out = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({ heading: m[1].trim(), content: m[2].trim() });
  }
  return out;
}

function firstUrl(text) {
  const m = text.match(/https?:\/\/[^\s)]+/i);
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
  const body = process.env.ISSUE_BODY || "";
  const issueNumber = process.env.ISSUE_NUMBER || "0";

  const sections = getSections(body);

  // Fallback por orden típico del form:
  // 0: Título del evento
  // 1: Fecha y hora
  // 2: Descripción
  // 3: Imagen del evento
  const title = sections[0]?.content;
  const date = sections[1]?.content;
  const description = sections[2]?.content;
  const imageBlock = sections[3]?.content;

  if (!title || !date || !description || !imageBlock) {
    console.log("DEBUG sections:", sections);
    throw new Error("Faltan campos requeridos en el Issue Form.");
  }

  const imageUrl = firstUrl(imageBlock);
  if (!imageUrl) {
    throw new Error("No se encontró URL de imagen. Adjunta la imagen (arrastrar/pegar) para que quede el link.");
  }

  // Guardar imagen en repo
  const outDir = path.join(process.cwd(), "images", "eventos");
  fs.mkdirSync(outDir, { recursive: true });

  let ext = ".png";
  const extMatch = imageUrl.toLowerCase().match(/\.(png|jpg|jpeg|webp)(\?|$)/);
  if (extMatch) ext = "." + extMatch[1].replace("jpeg", "jpg");

  const fileName = `event_${issueNumber}_${Date.now()}${ext}`;
  const localPath = path.join(outDir, fileName);
  await downloadToFile(imageUrl, localPath);

  const imagePathForSite = `images/eventos/${fileName}`;

  // Actualizar events.json (top 3)
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
