const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
      S3Client,
      GetObjectCommand,
      PutObjectCommand,
      DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
require("dotenv").config();

const client = new S3Client({
      region: process.env.S3_REGION,
      credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY,
      },
});

async function getSignedUrlS3(key) {
      const expireTime = 30 * 24 * 60 * 60; // 30 days in seconds
      const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Expires: expireTime, // Set expiration time
      });
      return getSignedUrl(client, command);
}

async function DeleteSignedUrlS3(key) {
      const expireTime = 30 * 24 * 60 * 60; // 30 days in seconds
      const command = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Expires: expireTime, // Set expiration time
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

async function PutObjectReels(user_id, filename) {
      const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: `Reels/${user_id}/${filename}`,
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
async function PutObjectReelsthumbnail(user_id, randomFilename) {
      const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: `Reels/${user_id}/${randomFilename}`,
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

async function PutObjectProfilePic(username) {
      const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: `Profile/${username}`,
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

// Export the function
module.exports = {
      getSignedUrlS3,
      PutObjectVideo,
      PutObjectVideothumbnail,
      PutObjectReels,
      PutObjectReelsthumbnail,
      PutObjectProfilePic,
      DeleteSignedUrlS3,
};
