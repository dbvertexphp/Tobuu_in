const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
      S3Client,
      GetObjectCommand,
      PutObjectCommand,
} = require("@aws-sdk/client-s3");
require("dotenv").config();

const client = new S3Client({
      region: process.env.S3_REGION,
      credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY,
      },
});

async function getSignedUrlCommandVideo(key) {
      const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
      });
      return getSignedUrl(client, command);
}

async function getSignedUrlCommandReels(key) {
      const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
      });
      return getSignedUrl(client, command);
}

async function PutObjectVideo(user_id, randomFilename) {
      const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: `Video/${user_id}/${randomFilename}`,
            ContentType: "video/mp4",
      });
      try {
            const url = await getSignedUrl(client, command);
            const key = command.input.Key;
            return Promise.resolve({ url, key }); // Dono ko response mein include karein
      } catch (error) {
            return Promise.reject(error);
      }
}
async function PutObjectVideothumbnail(user_id, randomFilename) {
      const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: `Video/${user_id}/${randomFilename}`,
            ContentType: ["image/jpeg", "image/png"],
      });
      try {
            const url = await getSignedUrl(client, command);
            const key = command.input.Key;
            return Promise.resolve({ url, key }); // Dono ko response mein include karein
      } catch (error) {
            return Promise.reject(error);
      }
}

async function PutObjectReels(filename) {
      const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: `Reels/${filename}`,
            ContentType: "video/mp4",
      });
      return getSignedUrl(client, command);
}

// Export the function
module.exports = {
      getSignedUrlCommandVideo,
      getSignedUrlCommandReels,
      PutObjectVideo,
      PutObjectVideothumbnail,
      PutObjectReels,
};
