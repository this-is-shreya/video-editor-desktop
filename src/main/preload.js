// 'use strict';
// const { contextBridge, ipcRenderer } = require('electron');
// const inv = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
// const on = (ch) => (cb) => { const h = (_e, d) => cb(d); ipcRenderer.on(ch, h); return () => ipcRenderer.removeListener(ch, h); };

// contextBridge.exposeInMainWorld('cursorStudio', {
//   // environment
//   listScreens: inv('screens:list'),
//   trackingSupport: inv('tracking:support'),
//   // projects
//   createProject: inv('project:create'),
//   saveProject: inv('project:save'),
//   loadProject: inv('project:load'),
//   listProjects: inv('projects:list'),
//   saveStyle: inv('project:saveStyle'),
//   deleteProject: inv('project:delete'),
//   revealProject: inv('project:reveal'),
//   saveExport: inv('project:export'),
//   // file streaming while recording
//   openStream: inv('stream:open'),
//   writeChunk: inv('stream:write'),
//   closeStream: inv('stream:close'),
//   // recording orchestration
//   setCaptureSource: inv('rec:setSource'),
//   prepareRecording: inv('rec:prepare'),
//   startTracking: inv('rec:start'),
//   stopTracking: inv('rec:stopTracking'),
//   finishRecording: inv('rec:finish'),
//   onStopRequest: on('rec:stop-request'),
//   // toolbar window
//   onToolbarState: on('toolbar:state'),
//   onToolbarTracking: on('toolbar:tracking'),
//   toolbarStop: () => ipcRenderer.send('toolbar:stop'),
//   toolbarToggle: () => ipcRenderer.send('toolbar:toggle'),
// });

'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const inv = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
const on = (ch) => (cb) => { const h = (_e, d) => cb(d); ipcRenderer.on(ch, h); return () => ipcRenderer.removeListener(ch, h); };

// Everything the React app (and the floating toolbar) can call. Nothing touches the disk.
contextBridge.exposeInMainWorld('cursorStudio', {
  listScreens: inv('screens:list'),
  trackingSupport: inv('tracking:support'),
  setCaptureSource: inv('rec:setSource'),
  prepareRecording: inv('rec:prepare'),    // minimize editor, show toolbar, 3-2-1
  startTracking: inv('rec:start'),
  stopTracking: inv('rec:stopTracking'),   // -> { events, segments, durationMs }
  stopNativeScreen: inv('rec:stopNative'), // finalize the cursor-less screen file -> { bytes, mime } (+ optional mic mux)
  finishRecording: inv('rec:finish'),      // restore editor, hide toolbar
  onStopRequest: on('rec:stop-request'),   // toolbar Stop / F10 -> returns an unsubscribe fn
  // toolbar window only
  onToolbarState: on('toolbar:state'),
  onToolbarTracking: on('toolbar:tracking'),
  toolbarStop: () => ipcRenderer.send('toolbar:stop'),
  toolbarToggle: () => ipcRenderer.send('toolbar:toggle'),
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    status: () => ipcRenderer.invoke('auth:status'),       // { loggedIn, user: { email, isPaid, isAdmin } }
    logout: () => ipcRenderer.invoke('auth:logout'),
    getToken: () => ipcRenderer.invoke('auth:token'),      // optional, for Authorization: Bearer on other API calls
    onChange: (cb) => {                                    // fires after the browser login completes
      const h = (_e, d) => cb(d);
      ipcRenderer.on('auth:changed', h);
      return () => ipcRenderer.removeListener('auth:changed', h);
    },
  },
  openRookieClip: () => ipcRenderer.invoke("app:openRookieClip"),
  onUpdateStatus: (callback) => {
  const listener = (_event, data) => callback(data);
  ipcRenderer.on("updates:status", listener);

  return () => {
    ipcRenderer.removeListener("updates:status", listener);
  };
},

onUpdateProgress: (callback) => {
  const listener = (_event, data) => callback(data);
  ipcRenderer.on("updates:progress", listener);

  return () => {
    ipcRenderer.removeListener("updates:progress", listener);
  };
},

installUpdate: () => ipcRenderer.invoke("updates:install"),
});