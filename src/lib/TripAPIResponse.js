const STATUS_OK = "OK";
const STATUS_FAILED = "FAILED";

export class TripAPIResponse {

  constructor(isSuccess, message, data = {}) {
    this.status = (isSuccess) ? STATUS_OK : STATUS_FAILED;
    this.message = message;
    this.data = data;
  }


}