import {dateTimeToTimestamp, timeLog, generateToken, timestampToDateTime} from './PCKUtils.js'
import {TripAPIResponse} from './TripAPIResponse.js'
import {Constants} from "./Constants.js"
import fsp from "fs/promises"
import fs from "fs"
import path from "path"
import exifr from "exifr";
import sharp from "sharp";
import * as util from "util";
import {} from 'dotenv/config'

const PATH_STORE = "store"
const FILE_METADATA = "metadata.json"
const DIR_PHOTOS_ORIGINAL = "photosOriginal"
const DIR_THUMBNAILS = "thumbnails"
const DIR_PHOTOS_METADATA = "photosMetadata"
const timestamp_offset_override = parseInt(process.env.TIMESTAMP_OFFSET_OVERRIDE);

export class TripPhotoMapManager {

  static createTrip(tripName, passphrase){
    timeLog(`TripPhotoMapManager.createTrip: tripName:[${tripName}]; passphrase:[${passphrase}]`)
    let tripPath = path.join(PATH_STORE, tripName)
    if (fs.existsSync(tripPath)){
      return new TripAPIResponse(false, `ERROR - trip already existed;`)
    }
    fs.mkdirSync(tripPath)
    let viewToken = generateToken(12)
    let writeToken = generateToken(12)
    let tripMetadataFile = path.join(tripPath, FILE_METADATA)
    let tripMetadataObject = {
      tripName,
      passphrase,
      viewToken,
      writeToken,
    }
    fs.writeFileSync(tripMetadataFile, JSON.stringify(tripMetadataObject))
    let dirPhotos = path.join(tripPath, DIR_PHOTOS_ORIGINAL)
    fs.mkdirSync(dirPhotos)
    let dirThumbnails = path.join(tripPath, DIR_THUMBNAILS)
    fs.mkdirSync(dirThumbnails)
    let dirPhotosMetadata = path.join(tripPath, DIR_PHOTOS_METADATA)
    fs.mkdirSync(dirPhotosMetadata)

    return new TripAPIResponse(true, `trip created;`, tripMetadataObject)

  }

  static loginTrip(tripName, passphrase){
    timeLog(`TripPhotoMapManager.loginTrip: tripName:[${tripName}]; passphrase:[${passphrase}]`)
    let tripPath = path.join(PATH_STORE, tripName)
    if (!fs.existsSync(tripPath)){
      return new TripAPIResponse(false, `ERROR - trip not found;`);
    }
    let tripMetadataFile = path.join(tripPath, FILE_METADATA)
    let tripMetadataObject = fs.readFileSync(tripMetadataFile)
    let tripMetadataJson = JSON.parse(tripMetadataObject)
    let passphraseFromMetadata = tripMetadataJson.passphrase
    //timeLog(`__passphraseFromMetadata:[${passphraseFromMetadata}]`)
    if (passphrase != passphraseFromMetadata){ 
      return new TripAPIResponse(false, `ERROR - incorrect passphrase;`)
    }
    return new TripAPIResponse(true, `trip login success;`, tripMetadataJson)
  }

  static getPublicTripMetadata(tripPath) {
    timeLog(`TripPhotoMapManager.getPublicTripMetadata: 1.0;`);
    let tripMetadataFile = path.join(tripPath, FILE_METADATA);
    let tripMetadataObject = fs.readFileSync(tripMetadataFile);
    let tripMetadataJson = JSON.parse(tripMetadataObject);
    let tripName = tripMetadataJson.tripName;

    return {tripName};
  }

  static accessTripByToken(token) {
    //timeLog(`TripPhotoMapManager.accessTripByToken: token:[${token}]`);

    let tripPath;
    let access;

    // TODO: dummy way now looping through all trips
    let storePath = path.join(PATH_STORE);
    let tripsDir = fs.readdirSync(storePath, {withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    for (let i = 0; i < tripsDir.length; i++) {
      let aTripDir = tripsDir[i];
      
      let tripMetadataFile = path.join(PATH_STORE, aTripDir, FILE_METADATA);
      let tripMetadataObject = fs.readFileSync(tripMetadataFile);
      let tripMetadataJson = JSON.parse(tripMetadataObject);
      
      let aWriteToken = tripMetadataJson.writeToken;
      if (aWriteToken == token) {
        tripPath = path.join(PATH_STORE, aTripDir);
        access = Constants.ACCESS_WRITE;
        return {tripPath, access};
      } 
      let aViewToken = tripMetadataJson.viewToken;
      if (aViewToken == token) {
        tripPath = path.join(PATH_STORE, aTripDir);
        access = Constants.ACCESS_VIEW;
        return {tripPath, access};
      }
    }
    return  {tripPath, access};
  }

  static async uploadTripPhoto(photo, username, tripPath) {
    let aPhotoIDPicked;
    let aPhotoFile;
    let aPhotoMetadataFile;
    let aThumbnailFile;
    do {
      aPhotoIDPicked = generateToken(4, true);
      aPhotoMetadataFile = path.join(tripPath, DIR_PHOTOS_METADATA, `${aPhotoIDPicked}.json`);
    } while (fs.existsSync(aPhotoMetadataFile))
    let aPhotoID = aPhotoIDPicked;
    let aPhotoName = `${aPhotoID}.jpg`;
    aPhotoFile = path.join(tripPath, DIR_PHOTOS_ORIGINAL, aPhotoName);
    aThumbnailFile = path.join(tripPath, DIR_THUMBNAILS, aPhotoName);

    let exifObj;
    try {
      exifObj = await exifr.parse(photo); 
    } catch (err) {
      timeLog(`uploadTripPhoto: ERROR - exifr.parse failed; ${err};`);
      return undefined;
    }
     
    let photoID = aPhotoID;
    let datetime = "n/a";
    let timestamp = "n/a";
    let latitude = "n/a";
    let longitude = "n/a";
    let uploadedBy = username;
    if (exifObj) {
      if (exifObj.DateTimeOriginal != undefined) {
        //timeLog(`uploadTripPhoto: exifObj.DateTimeOriginal:[${exifObj.DateTimeOriginal}];`);
        timestamp = dateTimeToTimestamp(exifObj.DateTimeOriginal) + timestamp_offset_override;
        datetime = timestampToDateTime(timestamp);
        //timeLog(`uploadTripPhoto: datetimeFinal:[${datetimeFinal}];`);
      }
      if (exifObj.latitude != undefined) {
        latitude = exifObj.latitude;
        longitude = exifObj.longitude;
      }
    }
    let photoMetadata = {photoID, datetime, timestamp, latitude, longitude, uploadedBy};
    try {
      let respFspMetadata = await fsp.writeFile(aPhotoMetadataFile, JSON.stringify(photoMetadata), {encoding: "utf8"});      
      let respFspOriginal = await fsp.writeFile(aPhotoFile, photo, {encoding: "utf8"});
      let respSharp = await sharp(aPhotoFile).resize(200, 200, {fit:sharp.fit.contain}).withMetadata().toFile(aThumbnailFile);
      //timeLog(`__about to return: aPhotoName:[${aPhotoName}];`);
      return aPhotoID;
    } catch (err) {
      timeLog(`uploadTripPhoto: ERROR - upload photo failed; ${err};`);
      return undefined;
    }
  }

  static async updatePhotoComment(comment, tripPath, photoID) {
    let thePhotoMetadataFile = path.join(tripPath, DIR_PHOTOS_METADATA, `${photoID}.json`);
    if (!fs.existsSync(thePhotoMetadataFile)){
      timeLog(`updatePhotoComment: ERROR - photo metadata file not found;`);
      return false;
    }
    let thePhotoMetadata = fs.readFileSync(thePhotoMetadataFile);
    let thePhotoMetadataJson = JSON.parse(thePhotoMetadata);
    
    if (thePhotoMetadataJson.uploadedByComment && thePhotoMetadataJson.uploadedByComment.length > 0) {
      timeLog(`updatePhotoComment: uploadedByComment found for photo [${photoID}], will override;`);
    } else {
      timeLog(`updatePhotoComment: adding a new uploadedByComment for photo [${photoID}];`);
    }
    
    thePhotoMetadataJson.uploadedByComment = comment;
    try {
      let respFspMetadata = await fsp.writeFile(thePhotoMetadataFile, JSON.stringify(thePhotoMetadataJson), {encoding: "utf8"});      
      return true;
    } catch (err) {
      timeLog(`uploadTripPhoto: ERROR - upload photo failed; ${err};`);
      return false;
    }
  }

  static getPhotosMetadata(tripPath, photoId = undefined) {
    //timeLog(`getPhotosMetadata: tripPath:[${tripPath}]; photoId:[${photoId}];`);
    let photosMetadataArray = [];
    let photosMetadataDir = path.join(tripPath, DIR_PHOTOS_METADATA);
    if (photoId == undefined) {
      let metadataFiles = fs.readdirSync(photosMetadataDir, {withFileTypes: true });
      for (let i = 0; i < metadataFiles.length; i++) {
        let aMetaDataFileName = metadataFiles[i].name;
        let aMetaDataFile = path.join(tripPath, DIR_PHOTOS_METADATA, aMetaDataFileName);
        let aMetadata = fs.readFileSync(aMetaDataFile);
        //timeLog(`getPhotosMetadata: [${i}]:[${aMetadata}];`);
        photosMetadataArray.push(JSON.parse(aMetadata));
      }
    } else {
      let aMetadataFile = path.join(tripPath, DIR_PHOTOS_METADATA, `${photoId}.json`);
      try {
        let aMetadata = fs.readFileSync(aMetadataFile);
        //timeLog(`getPhotosMetadata: [${i}]:[${aMetadata}];`);
        photosMetadataArray.push(JSON.parse(aMetadata));
      } catch (err) {
        timeLog(`getPhotosMetadata: ERROR in fs.readFileSync; ${err};`);
      }
    }
    return photosMetadataArray;
  }

  static getThumbnailB64(tripPath, photoId) {
    let aThumbnailB64;
    let aThumbnailFile = path.join(tripPath, DIR_THUMBNAILS, `${photoId}.jpg`);
    try {
      let aThumbnailBinary =  fs.readFileSync(aThumbnailFile);
      aThumbnailB64 = aThumbnailBinary.toString("base64");
    } catch (err) {
      timeLog(`getThumbnailB64: ERROR in fs.readFileSync; ${err};`);
    }
    return aThumbnailB64;
  }

  static getPhotoB64(tripPath, photoId) {
    let aPhotoB64;
    let aPhotoFile = path.join(tripPath, DIR_PHOTOS_ORIGINAL, `${photoId}.jpg`);
    try {
      let aPhotoBinary =  fs.readFileSync(aPhotoFile);
      aPhotoB64 = aPhotoBinary.toString("base64");
    } catch (err) {
      timeLog(`getPhotoB64: ERROR in fs.readFileSync; ${err};`);
    }
    return aPhotoB64;
  }

  static getPhotoBinary(tripPath, photoId) {
    let aPhotoBinary;
    let aPhotoFile = path.join(tripPath, DIR_PHOTOS_ORIGINAL, `${photoId}.jpg`);
    try {
      aPhotoBinary =  fs.readFileSync(aPhotoFile);
    } catch (err) {
      timeLog(`getPhotoBinary: ERROR in fs.readFileSync; ${err};`);
    }
    return aPhotoBinary;
  }

  static getPhotoFile(tripPath, photoId) {
    let aPhotoFile = path.join(path.resolve(), tripPath, DIR_PHOTOS_ORIGINAL, `${photoId}.jpg`);
    return aPhotoFile;
  }

  static deletePhoto(tripPath, photoId) {
    let isDeleted = false;
    let aPhotoFile = path.join(tripPath, DIR_PHOTOS_ORIGINAL, `${photoId}.jpg`);
    let aThumbnailFile = path.join(tripPath, DIR_THUMBNAILS, `${photoId}.jpg`);
    let aPhotoMetadataFile = path.join(tripPath, DIR_PHOTOS_METADATA, `${photoId}.json`);
    try {
      fs.unlinkSync(aPhotoFile);
      fs.unlinkSync(aThumbnailFile);
      fs.unlinkSync(aPhotoMetadataFile);
      isDeleted = true;
    } catch (err) {
      timeLog(`deletePhoto: ERROR - in fs.unlinkSync; ${err};`);
    }
    return isDeleted;
  }

}