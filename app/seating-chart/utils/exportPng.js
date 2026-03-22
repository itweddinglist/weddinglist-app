import { Canvg } from "canvg";

async function fetchFontsAsBase64() {
  try {
    const cssRes = await fetch(
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:wght@300;400;500;600&display=swap"
    );
    const css = await cssRes.text();
    const urls = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map((m) => m[1]);
    const fontFaces = await Promise.all(
      urls.map(async (url) => {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const ext = url.includes("woff2") ? "woff2" : "woff";
        return `url("data:font/${ext};base64,${b64}")`;
      })
    );
    let i = 0;
    return css.replace(/url\((https:\/\/[^)]+)\)/g, () => fontFaces[i++] || "");
  } catch {
    return "";
  }
}

function getBoundingBox(tables, getTableDims) {
  if (!tables || tables.length === 0) return { x: 0, y: 0, w: 1200, h: 800 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  tables.forEach((t) => {
    const d = getTableDims(t);
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + d.w);
    maxY = Math.max(maxY, t.y + d.h);
  });
  const PAD = 120;
  return { x: minX - PAD, y: minY - PAD, w: maxX - minX + PAD * 2, h: maxY - minY + PAD * 2 };
}

export async function exportToPng({ svgEl, tables, getTableDims, mode = "fit" }) {
  const bbox = getBoundingBox(tables, getTableDims);

  let canvasW, canvasH, viewBox;

  if (mode === "fit") {
    const scale = 2;
    canvasW = Math.round(bbox.w * scale);
    canvasH = Math.round(bbox.h * scale);
    viewBox = `${bbox.x} ${bbox.y} ${bbox.w} ${bbox.h}`;
  } else {
    canvasW = 3508;
    canvasH = 2480;
    const scale = Math.min((canvasW - 240) / bbox.w, (canvasH - 240) / bbox.h);
    const scaledW = bbox.w * scale;
    const scaledH = bbox.h * scale;
    const vbW = canvasW / scale;
    const vbH = canvasH / scale;
    const offsetX = bbox.x - (vbW - bbox.w) / 2;
    const offsetY = bbox.y - (vbH - bbox.h) / 2;
    viewBox = `${offsetX} ${offsetY} ${vbW} ${vbH}`;
  }

  const fontCSS = await fetchFontsAsBase64();

  const svgClone = svgEl.cloneNode(true);
  svgClone.setAttribute("width", canvasW);
  svgClone.setAttribute("height", canvasH);
  svgClone.setAttribute("viewBox", viewBox);

  // Scoatem grid-ul
  const gridRect = svgClone.querySelector('rect[data-bg="1"]');
  if (gridRect) gridRect.setAttribute("fill", "#FAF7F2");

  // Scoatem bordura planului
  const borderRect = svgClone.querySelectorAll("rect")[1];
  if (borderRect) borderRect.setAttribute("opacity", "0");

  // Injectăm fonturile
  if (fontCSS) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = fontCSS;
    svgClone.insertBefore(style, svgClone.firstChild);
  }

  const svgStr = new XMLSerializer().serializeToString(svgClone);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  // Fundal alb explicit pe canvas
  ctx.fillStyle = "#FAF7F2";
  ctx.fillRect(0, 0, canvasW, canvasH);

  try {
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject();
      };
      img.src = url;
    });
  } catch {
    const v = await Canvg.fromString(ctx, svgStr);
    await v.render();
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
