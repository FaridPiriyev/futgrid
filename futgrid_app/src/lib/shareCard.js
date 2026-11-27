// Draws a 1080×1350 result card (Instagram story / post friendly) on a canvas and returns a PNG File.

function fit(ctx, text, maxWidth, size, weight = 800) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px "Roboto Condensed", "Arial Narrow", sans-serif`;
    s -= 4;
  } while (ctx.measureText(text).width > maxWidth && s > 24);
}

export async function resultCard({ game, me, them, score, verdict, won, draw }) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  try {
    await document.fonts?.ready;
  } catch {
    // fonts optional
  }

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b1430");
  bg.addColorStop(1, "#13235a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let x = 0; x < W; x += 160) ctx.fillRect(x, 0, 80, H);

  // accent glow
  const glow = ctx.createRadialGradient(W / 2, 560, 50, W / 2, 560, 520);
  glow.addColorStop(0, won ? "rgba(255,194,61,0.35)" : draw ? "rgba(255,255,255,0.12)" : "rgba(59,130,246,0.3)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffc23d";
  ctx.font = '900 64px "Tektur", "Roboto Condensed", sans-serif';
  ctx.fillText("FUTGRID", W / 2, 150);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  fit(ctx, game.toUpperCase(), W - 160, 46, 700);
  ctx.fillText(game.toUpperCase(), W / 2, 230);

  // verdict
  ctx.fillStyle = won ? "#ffc23d" : "#ffffff";
  fit(ctx, verdict.toUpperCase(), W - 140, 120, 900);
  ctx.fillText(verdict.toUpperCase(), W / 2, 430);

  // score
  if (score) {
    ctx.fillStyle = "#ffffff";
    ctx.font = '700 240px "Tektur", "Roboto Condensed", sans-serif';
    ctx.fillText(score, W / 2, 740);
  }

  // names
  const y = score ? 900 : 700;
  ctx.fillStyle = "#3b82f6";
  fit(ctx, me.toUpperCase(), 420, 64);
  ctx.fillText(me.toUpperCase(), W / 2 - 260, y);
  ctx.fillStyle = "#ffc23d";
  fit(ctx, them.toUpperCase(), 420, 64);
  ctx.fillText(them.toUpperCase(), W / 2 + 260, y);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = '800 54px "Roboto Condensed", sans-serif';
  ctx.fillText("VS", W / 2, y);

  // footer
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = '700 44px "Roboto Condensed", sans-serif';
  ctx.fillText("futgrid.az", W / 2, H - 120);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = '400 34px "Roboto", sans-serif';
  ctx.fillText("Futbol biliyini sına · dostunla yarış", W / 2, H - 70);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return new File([blob], "futgrid-netice.png", { type: "image/png" });
}
