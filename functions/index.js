const functions = require('firebase-functions');
const { Storage } = require('@google-cloud/storage');
const os = require('os');
const path = require('path');
const spawn = require('child-process-promise').spawn;


const admin = require("firebase-admin");

const serviceAccount = require("path/to/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://shiftr-9f44e.firebaseio.com"
});

const projectId = 'shiftr-9f44e'
let gcs = new Storage ({
    projectId
  });    



// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.onFileFinalize = functions.storage.object().onFinalize(event => {

    const object = event.data;
    const bucket = event.bucket;
    const contentType = event.contentType;
    const filePath = event.name;

    console.log("File change detected, function execution started");

    if (object.resourceState === "not_exists") {
      console.log("We deleted a file, exit...");
      return;
    }
  
    if (path.basename(filePath).startsWith("resized-")) {
      console.log("We already renamed that file!");
      return;
    }
  
    const destBucket = gcs.bucket(bucket);
    const tmpFilePath = path.join(os.tmpdir(), path.basename(filePath));
    const metadata = { contentType: contentType };
    return destBucket
      .file(filePath)
      .download({
        destination: tmpFilePath
      })
      .then(() => {
        return spawn("convert", [tmpFilePath, "-resize", "500x500", tmpFilePath]);
      })
      .then(() => {
        return destBucket.upload(tmpFilePath, {
          destination: "resized-" + path.basename(filePath),
          metadata: metadata
        });
      });
  });
  
  exports.uploadFile = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
      if (req.method !== "POST") {
        return res.status(500).json({
          message: "Not allowed"
        });
      }
      const busboy = new Busboy({ headers: req.headers });
      let uploadData = null;
  
      busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        const filepath = path.join(os.tmpdir(), filename);
        uploadData = { file: filepath, type: mimetype };
        file.pipe(fs.createWriteStream(filepath));
      });
  
      busboy.on("finish", () => {
        const bucket = gcs.bucket("fb-cloud-functions-demo.appspot.com");
        bucket
          .upload(uploadData.file, {
            uploadType: "media",
            metadata: {
              metadata: {
                contentType: uploadData.type
              }
            }
          })
          .then(() => {
            res.status(200).json({
              message: "It worked!"
            });
          })
          .catch(err => {
            res.status(500).json({
              error: err
            });
          });
      });
      busboy.end(req.rawBody);
    });
  });
  
  exports.onDataAdded = functions.database.ref('/message/{id}').onCreate(event => {
      const data = event.data.val();
      const newData = {
          msg: event.params.id + '-' + data.msg.toUpperCase()
      };
      return event.data.ref.child('copiedData').set(newData);
  });
  
exports.onFileDelete = functions.storage.object().onDelete(event => {
    console.log(event)
    return;
});
