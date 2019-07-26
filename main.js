// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, MenuItem, ipcMain, dialog} = require('electron');
const path = require('path')
const Modbus = require('jsmodbus')
const net = require('net')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})
//create global handles
let client = null
let socket = null
let poll = null

sendToWindow = (signal, payload)=>{
  mainWindow.webContents.send(signal, JSON.stringify(payload));
}

//helper functions to get value as the number type of the tag
const parseBuffer = (tag, buffer)=>{
  let val
  if(tag.func==="0" || tag.func == "1"){
    tag.dataType = "0" //force to bool for coil or discrete status
  }
  switch(tag.dataType){
    case "0": //bool
      val = (!buffer.readUInt8(0) == 0);
      break;
    case "1": //int
      val = buffer.readInt16BE(0);
      break;
    case "2": //dint
      val = buffer.readInt32BE(0);
      break;
    case "3": //real
      val = buffer.readFloatBE(0);
      break;
  }
  return val
} 



ipcMain.on('connect', (e, payload)=>{
  console.log(payload)
  payload = JSON.parse(payload) //get it back to an object
  socket = new net.Socket()
  const unitId = 1;
  client = new Modbus.client.TCP(socket, unitId)
  const options = {
  'host' : payload.host,
  'port' : payload.port
  }
  
  
  startPolling = ()=>{poll = setInterval(()=>{
    const dataTypes = [
      {name: "BOOL", registers: 1},
      {name: "INT", registers: 1},
      {name: "DINT", registers: 2},
      {name: "REAL", registers: 2}
    ];
    const reads = payload.tags.map((tag)=>{
      switch(tag.func){
        case "0":
          return client.readCoils(Number(tag.addr), 1); //bool only, single register
        case "1":
          return client.readDiscreteInputs(Number(tag.addr), 1); //bool only, single register
        case "2":
          return client.readInputRegisters(Number(tag.addr), dataTypes[Number(tag.dataType)].registers);
        case "3":
          return client.readHoldingRegisters(Number(tag.addr), dataTypes[Number(tag.dataType)].registers);
      }
    })
    Promise.all(reads)
    .then(results=>{
      const tagVals = results.map((resp, tagIdx)=>{
      //console.log(payload.tags[tagIdx], resp.response.body.valuesAsBuffer)
      return parseBuffer(payload.tags[tagIdx], resp.response.body.valuesAsBuffer)
      })
      sendToWindow('tagUpdate', tagVals)

    })
    .catch(err=>console.log(err))
    }, payload.rate);
  }
  socket.on('connect', startPolling)
  socket.on('error', err=>console.log(err))
  socket.connect(options)
})

ipcMain.on('disconnect', (e, payload)=>{
  clearInterval(poll)
  poll = null;
  if(socket){
    socket.end()
    socket = null;
  }
  client = null;
  console.log('closed connection');
})


