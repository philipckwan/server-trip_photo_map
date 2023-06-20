export function timeLog(msg) {
  let current = new Date();
  let currentTime  = current.toLocaleTimeString();
  console.log(`[${currentTime}]${msg}`);
};

export function dateTimeToTimestamp(dateTime) {
  //console.log(`dateTimeToTimestamp: dateTime:[${dateTime}];`)
  let date = new Date(dateTime);
  let timestamp = date.getTime();
  //console.log(`dateTimeToTimestamp: timestamp:[${timestamp}];`);
  return timestamp;
}

export function timestampToDateTime(timestamp) {
  //console.log(`timestampToDateTime: timestamp:[${timestamp}];`);
  let date = new Date(timestamp);
  //console.log(`timestampToDateTime: date:[${date}];`);
  return date;
}

const tokenCharset="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
const tokenCharsetLowerCases="0123456789abcdefghijklmnopqrstuvwxyz"
export function generateToken(length = 10, isLowerCaseOnly = false) {
  let token = "";
  let charSet = isLowerCaseOnly ? tokenCharsetLowerCases : tokenCharset;
  for (let i = 0; i < length; i++) {
    let index = Math.floor(Math.random() * charSet.length);
    token += charSet[index];
    
  }
  return token;
}



