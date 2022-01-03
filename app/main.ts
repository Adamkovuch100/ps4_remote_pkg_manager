import { app, BrowserWindow, dialog, Menu, ipcMain } from 'electron';
import * as remote from "@electron/remote/main";
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';

let win: BrowserWindow = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

function createWindow(): BrowserWindow {
  // Create the browser window.
  win = new BrowserWindow({
    width: 670,
    height: 600,
    minWidth: 670,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: (serve) ? true : false,
      contextIsolation: false,  // false if you want to run e2e test with Spectron,
      webSecurity: false,
    },
  });
  win.center();

  Menu.setApplicationMenu(null);

  remote.initialize();
  remote.enable(win.webContents);

  let allowClose = false;

  if (serve) {
    win.webContents.openDevTools();
    require('electron-reload')(__dirname, {
      electron: require(path.join(__dirname, '/../node_modules/electron')),
    });
    win.loadURL('http://localhost:4200');
  } else {
    // Path when running electron executable
    let pathIndex = './index.html';

    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
       // Path when running electron in local folder
      pathIndex = '../dist/index.html';
    }

    win.loadURL(url.format({
      pathname: path.join(__dirname, pathIndex),
      protocol: 'file:',
      slashes: true
    }));
  }
  win.on('close', async (e) => {
    if(!allowClose) {
      e.preventDefault();

      const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        title: '  Confirm  ',
        message: 'Are you sure that you want to close this window? This action will stop downloading on your PS4',
        buttons: ['Yes', 'No'],
      });
  
      if (response === 0) {
        allowClose = true;
        app.quit();
      }
    }
  })
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => setTimeout(createWindow, 400));

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  ipcMain.on('asynchronous-message', function (evt, messageObj) {
    // Send message back to renderer.
    if (messageObj === 'getAppSettings') {
        evt.sender.send('asynchronous-message', {
          appDataPath: path.join(app.getPath('appData'), app.getName()),
        });
    }
});

} catch (e) {
  // Catch Error
  // throw e;
}
