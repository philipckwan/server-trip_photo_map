import express from "express";
import bodyParser from "body-parser";
import {timeLog} from "./lib/PCKUtils.js"
import {Constants} from "./lib/Constants.js"

import { TripAPIResponse } from "./lib/TripAPIResponse.js";
import { TripPhotoMapManager } from "./lib/TripPhotoMapManager.js";

const app = express();
app.use(express.json());



/* This below helps with CORS for calling from other places like a nextjs
 https://stackoverflow.com/questions/65058598/nextjs-cors-issue
*/
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
if (req.method == "OPTIONS") {
  res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
  return res.status(200).json({});
}
next();
});

app.use(bodyParser.raw({type: '*/*', limit : '10mb'}))


/**
 * GET /version
 * 
 */
app.get("/version", (req, res) => {
  timeLog(`serverTPM: get./version;`);
  let apiResponse = new TripAPIResponse(true, "got server version and info", {name: Constants.name, version: Constants.version, uuid: Constants.uuid,});
  res.json(apiResponse);
});

/**
 * POST /trip/create
 * 
 */
app.post("/trip/create", (req, res) => {
  timeLog(`serverTPM: post./trip/create; 1.0;`)
  let tripName = req.body.tripName
  let passphrase = req.body.passphrase
  let apiResponse = TripPhotoMapManager.createTrip(tripName, passphrase)
  return res.json(apiResponse)
})

/**
 * POST /trip/login
 * 
 */
app.post("/trip/login", (req, res) => {
  timeLog(`serverTPM: post./trip/login; 1.0;`)
  let tripName = req.body.tripName
  let passphrase = req.body.passphrase
  let apiResponse = TripPhotoMapManager.loginTrip(tripName, passphrase)
  return res.json(apiResponse)
})

/**
 * POST /trip/access/<token>/upload/<username>
 * access: write
 */
app.post("/trip/access/:token/upload/:username", async (req, res) => {
  let token = req.params.token;
  let username = req.params.username;
  timeLog(`serverTPM: post./trip/access/:token/upload/:username; 1.0; token:[${token}] username:[${username}]`);
  let {tripPath, access} = TripPhotoMapManager.accessTripByToken(token);
  timeLog(`serverTPM: from TripPhotoMapManager.accessTripByToken: tripPath:[${tripPath}] access:[${access}]`);
  if (tripPath == undefined) {
    return res.json(new TripAPIResponse(false, "ERROR - trip not found by token", {}));
  }
  
  if (access == Constants.ACCESS_WRITE) {
    //return res.json(new TripAPIResponse(true, "access granted", {tripPath, access}));
    let photoID = await TripPhotoMapManager.uploadTripPhoto(req.body, username, tripPath);
      if (photoID == undefined) {
        return res.json(new TripAPIResponse(false, `ERROR - upload photo failed;`));
      } else {
        return res.json(new TripAPIResponse(true, "photo uploaded", {tripPath, access, photoID}))
      }
  } else {
    // If this is only a viewToken, but not a writeToken, then access is denied.
    return res.json(new TripAPIResponse(false, "ERROR - access denied", {tripPath, access}));
  }

})

/**
 * GET /trip/access/<token>/photosMetadata/
 * access: view
 */
app.get("/trip/access/:token/photosMetadata", (req, res) => {
  let token = req.params.token;
  let {tripPath, access} = TripPhotoMapManager.accessTripByToken(token);
  if (tripPath == undefined) {
    return res.json(new TripAPIResponse(false, "ERROR - trip not found by token", {}));
  }

  if (access == Constants.ACCESS_VIEW || access == Constants.ACCESS_WRITE) {
    let photosMetadata = TripPhotoMapManager.getPhotosMetadata(tripPath);
    return res.json(new TripAPIResponse(true, "got photos metadata", {tripPath, access, photosMetadata}));
  } else {
    return res.json(new TripAPIResponse(false, "ERROR - access denied", {tripPath, access}));
  }
})

/**
 * GET /trip/access/<token>/photosMetadata/<photoId>
 * access: view
 */
app.get("/trip/access/:token/photosMetadata/:photoId", (req, res) => {
  let token = req.params.token;
  let photoId = req.params.photoId;
  let {tripPath, access} = TripPhotoMapManager.accessTripByToken(token);
  if (tripPath == undefined) {
    return res.json(new TripAPIResponse(false, "ERROR - trip not found by token", {}));
  }

  if (access == Constants.ACCESS_VIEW || access == Constants.ACCESS_WRITE) {
    let aPhotoMetadata = TripPhotoMapManager.getPhotosMetadata(tripPath, photoId)[0];
    if (aPhotoMetadata == undefined) {
      return res.json(new TripAPIResponse(false, "photo metadata not found", {tripPath, access}));
    }
    return res.json(new TripAPIResponse(true, "got a photo metadata", {tripPath, access, aPhotoMetadata}));
  } else {
    return res.json(new TripAPIResponse(false, "ERROR - access denied", {tripPath, access}));
  }
})

/**
 * GET /trip/access/<token>/thumbnails/<photoId>
 * access: view
 */
app.get("/trip/access/:token/thumbnails/:photoId", (req, res) => {
  let token = req.params.token;
  let photoId = req.params.photoId;
  let {tripPath, access} = TripPhotoMapManager.accessTripByToken(token);
  if (tripPath == undefined) {
    return res.json(new TripAPIResponse(false, "ERROR - trip not found by token", {}));
  }

  if (access == Constants.ACCESS_VIEW || access == Constants.ACCESS_WRITE) {
    let thumbnailB64 = TripPhotoMapManager.getThumbnailB64(tripPath, photoId);
    if (thumbnailB64 == undefined) {
      return res.json(new TripAPIResponse(false, "thumbnail not found", {tripPath, access}));
    }
    return res.json(new TripAPIResponse(true, "got a thumbnail", {tripPath, access, thumbnailB64}));
  } else {
    return res.json(new TripAPIResponse(false, "ERROR - access denied", {tripPath, access}));
  }
})

/**
 * GET /trip/access/<token>/photos/<photoId>
 * access: view
 */
app.get("/trip/access/:token/photos/:photoId", (req, res) => {
  let token = req.params.token;
  let photoId = req.params.photoId;
  let {tripPath, access} = TripPhotoMapManager.accessTripByToken(token);
  if (tripPath == undefined) {
    return res.json(new TripAPIResponse(false, "ERROR - trip not found by token", {}));
  }

  if (access == Constants.ACCESS_VIEW || access == Constants.ACCESS_WRITE) {
    let photoB64 = TripPhotoMapManager.getPhotoB64(tripPath, photoId);
    if (photoB64 == undefined) {
      return res.json(new TripAPIResponse(false, "photo not found", {tripPath, access}));
    }
    return res.json(new TripAPIResponse(true, "got a photo", {tripPath, access, photoB64}));
  } else {
    return res.json(new TripAPIResponse(false, "ERROR - access denied", {tripPath, access}));
  }
})

/**
 * DELETE /trip/access/<token>/photos/<photoId>
 * access: write
 */
app.delete("/trip/access/:token/photos/:photoId", (req, res) => {
  let token = req.params.token;
  let photoId = req.params.photoId;
  timeLog(`serverTPM: delete./trip/access/:token/photos/:photoId; 1.0; token:[${token}] photoId:[${photoId}]`);
  let {tripPath, access} = TripPhotoMapManager.accessTripByToken(token);
  if (tripPath == undefined) {
    return res.json(new TripAPIResponse(false, "ERROR - trip not found by token", {}));
  }

  if (access == Constants.ACCESS_WRITE) {
    let isDeleted = TripPhotoMapManager.deletePhoto(tripPath, photoId);
    if (!isDeleted) {
      return res.json(new TripAPIResponse(false, "photo delete failed", {tripPath, access}));
    }
    return res.json(new TripAPIResponse(true, `photo [${photoId}] delete successfully`, {tripPath, access}));
  } else {
    return res.json(new TripAPIResponse(false, "ERROR - access denied", {tripPath, access}));
  }
})

app.listen(5000, () => {
  //timeLog("serverBattleship: Server started on port 5000 pck; 3.3");
  timeLog(`serverTPM: Server started on port 5000; pck: version:${Constants.version};`);

})