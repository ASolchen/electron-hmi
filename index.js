const electron = require('electron');
const {ipcRenderer} = electron;

const sendToBackend = (signal, payload)=>{
    ipcRenderer.send(signal, JSON.stringify(payload));
}; 

ipcRenderer.on('tagUpdate', (payload)=>{

})

let lastFunc = 0;
let lastDataType = 0;
const functionOptions = ["Coil", "Input Status", "Input Register", "Holding Register"]
const dataTypeOptions = [
  {name: "BOOL", registers: 1},
  {name: "INT", registers: 1},
  {name: "DINT", registers: 2},
  {name: "REAL", registers: 2}
];
let docElements = {
  host: document.getElementById("host"),
  port: document.getElementById("port"),
  rate: document.getElementById("rate"),
  rows: [] //array of the rows as they are added
}

const setSettingsLock = (locked)=>{//used to lock the settings once the client connects
  docElements.host.disabled = locked;
  docElements.port.disabled = locked;
  docElements.rate.disabled = locked;
  docElements.rows.map((row)=>{
    row.funcSelect.disabled = locked;
    row.addrInput.disabled = locked;
    row.dataTypeSelect.disabled = locked;
    })
}

const makeDataTypeSelect = ()=>{
  let sel = document.createElement("select");
  for (let op in dataTypeOptions){
    let option = document.createElement("option")
    sel.appendChild(option)
    option.value = op
    option.innerHTML = dataTypeOptions[op].name
  }
  return sel
}

const makeFuncSelect = ()=>{
  let sel = document.createElement("select");
  for (let op in functionOptions){
    let option = document.createElement("option")
    sel.appendChild(option)
    option.value = op
    option.innerHTML = functionOptions[op]
  }
  return sel
}

const addRow = ()=>{
  const tBody = document.getElementById("tagTable").children[0]
  const idx = tBody.children.length
  console.log(idx)
  const row = document.createElement("tr")
  tBody.append(row)
  let funcSelect = makeFuncSelect();
  let addrInput = document.createElement("input")
  addrInput.type = "number"
  addrInput.value = 0
  let dataTypeSelect = makeDataTypeSelect();
  let tagValue = document.createElement('p')
  tagValue.innerHTML = "??"
  docElements.rows.push({
    row: row,
    addrInput: addrInput,
    funcSelect: funcSelect,
    dataTypeSelect: dataTypeSelect,
    tagValue: tagValue
  })
  let td = document.createElement("td")
  row.appendChild(td)
  td.appendChild(funcSelect)
  td = document.createElement("td")
  row.appendChild(td)
  td.appendChild(dataTypeSelect)
  td = document.createElement("td")
  row.appendChild(td)
  td.appendChild(addrInput)
  td = document.createElement("td")
  row.appendChild(td)
  td.appendChild(tagValue)
}

const connect = ()=>{
  const payload = {
    host: docElements.host.value,
    port: docElements.port.value,
    rate: docElements.rate.value,
    tags: docElements.rows.map((row)=>{
      return {
      func: row.funcSelect.value,
      addr: row.addrInput.value,
      dataType: row.dataTypeSelect.value
    }
  })
  }
  setSettingsLock(true)
  console.log(payload)
  sendToBackend('connect', payload)
}

const disconnect = ()=>{
  setSettingsLock(false)
  sendToBackend('disconnect', '')
}