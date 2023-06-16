export function timeLog(msg) {
  let current = new Date();
  let currentTime  = current.toLocaleTimeString();
  console.log(`v2-[${currentTime}]${msg}`);
};

export function dateTimeToTimestamp(dateTime) {
    let date = new Date(dateTime)
    return date.getTime()
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



