/** Canvas 2D helper to draw the official OpenAI / ChatGPT 6-loop vortex logo */
export const drawChatGPTLogo = (
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color = "#ffffff"
) => {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = color;
  g.lineWidth = r * 0.16;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (let i = 0; i < 6; i++) {
    g.save();
    g.rotate((i * Math.PI) / 3);
    g.beginPath();
    g.moveTo(0, -r * 0.28);
    g.lineTo(r * 0.42, -r * 0.28);
    g.arc(r * 0.42, 0, r * 0.28, -Math.PI / 2, Math.PI / 6);
    g.lineTo(r * 0.14, r * 0.48);
    g.stroke();
    g.restore();
  }
  g.restore();
};
