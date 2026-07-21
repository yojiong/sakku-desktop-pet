const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sakku", {
  beginDrag: point => ipcRenderer.send("drag:start", point),
  drag: point => ipcRenderer.send("drag:move", point),
  endDrag: () => ipcRenderer.send("drag:end"),
  movePet: point => ipcRenderer.send("pet:move", point),
  getPetBounds: () => ipcRenderer.invoke("pet:get-bounds"),
  getWorkArea: () => ipcRenderer.invoke("pet:get-work-area"),
  showContextMenu: () => ipcRenderer.send("context-menu"),
  setMouseIgnored: ignore => ipcRenderer.send("mouse:set-ignore", ignore),
  onVolumeChanged: callback => ipcRenderer.on("volume-changed", (_, value) => callback(value)),
  onScaleChanged: callback => ipcRenderer.on("pet:set-scale", (_, value) => callback(value))
});
