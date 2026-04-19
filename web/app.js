const canvas = document.getElementById("canvas");

const layout = {
  width: 296,
  height: 128,
  elements: []
};

function addText(x, y, text) {
  const el = {
    type: "text",
    x,
    y,
    text
  };
  layout.elements.push(el);
  render();
}

function render() {
  canvas.innerHTML = "";

  for (const el of layout.elements) {
    if (el.type === "text") {
      const textNode = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      textNode.setAttribute("x", el.x);
      textNode.setAttribute("y", el.y);
      textNode.textContent = el.text;
      canvas.appendChild(textNode);
    }
  }
}

// test
addText(10, 20, "Hello e-paper");
