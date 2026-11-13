// Google Apps Script: saves each customer bill into the Drive folder
// "Warrantys.co Customer Invoices", inside a sub-folder named by lead number.
// Paste it at script.google.com (signed in as warrantys.co.amz@gmail.com),
// change SECRET, then Deploy > New deployment > Web app > "Anyone".
const SECRET = "CHANGE-THIS-TO-A-LONG-RANDOM-TEXT";
const ROOT_NAME = "Warrantys.co Customer Invoices";

function folder(parent, name) {
  const found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.secret !== SECRET) return out({ ok: false });
  const root = folder(DriveApp.getRootFolder(), ROOT_NAME);
  const lead = folder(root, String(data.leadReference).replace(/[^A-Za-z0-9-]/g, ""));
  const blob = Utilities.newBlob(Utilities.base64Decode(data.base64), "application/octet-stream", data.fileName);
  lead.createFile(blob);
  return out({ ok: true });
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
